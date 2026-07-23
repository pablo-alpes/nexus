/**
 * Create article-level questionnaire for Chilean Privacy Law (Ley 21.719)
 *
 * Strategy:
 * - 1 primary question per article (66 articles)
 * - For articles with multiple literals/requirements, add follow-up questions
 *   for each significant literal so gap analysis does not lose obligations
 * - Answers: Sí / No / No Aplica (3 choices)
 *
 * Usage:
 *   USE_LOCAL_STORAGE=true npx tsx scripts/create-chilean-privacy-article-questionnaire.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { connectDBLocal, isLocalStorage } from '../lib/mongodb-local';
import Question, { getQuestionModel, QuestionType } from '../models/Question';
import { RegulationType } from '../lib/regulations';

interface RequirementRow {
  requirementId: string;
  article: string;
  paragraph?: string | null;
  literal?: string | null;
  nestedNumber?: string | null;
  level?: number;
  parentRequirementId?: string | null;
  title?: string;
  description?: string;
  legalText?: string;
  fullLegalText?: string;
  pillar?: string;
}

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'not_applicable', label: 'No Aplica' },
];

function articleSortKey(article: string): number {
  const match = article.match(/Artículo\s+(\d+)/i);
  const n = match ? parseInt(match[1], 10) : 9999;
  // Keep bis/ter/etc after base article number via suffix weight
  const suffix = article.toLowerCase();
  let weight = 0;
  if (suffix.includes('bis')) weight = 1;
  else if (suffix.includes('ter')) weight = 2;
  else if (suffix.includes('quater') || suffix.includes('quáter')) weight = 3;
  else if (suffix.includes('quinquies')) weight = 4;
  else if (suffix.includes('sexies')) weight = 5;
  else if (suffix.includes('septies')) weight = 6;
  else if (suffix.includes('octies')) weight = 7;
  else if (suffix.includes('nonies')) weight = 8;
  return n * 10 + weight;
}

function slugArticle(article: string): string {
  return article
    .replace(/^Artículo\s+/i, '')
    .replace(/\s+/g, '-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

function truncate(text: string, max = 220): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + '…';
}

function isParentRequirement(req: RequirementRow, allInArticle: RequirementRow[]): boolean {
  if (!req.parentRequirementId) return true;
  // Parent if other rows reference this as parent
  return allInArticle.some((r) => r.parentRequirementId === req.requirementId);
}

function buildArticleQuestionText(article: string, parent: RequirementRow | undefined, reqs: RequirementRow[]): string {
  const title = parent?.title || parent?.description || reqs[0]?.title || reqs[0]?.description || '';
  const clean = truncate(title, 180);
  if (clean) {
    return `Respecto de ${article}: ¿la organización cumple con las obligaciones de «${clean}»?`;
  }
  return `Respecto de ${article}: ¿la organización cumple con las obligaciones previstas en este artículo de la Ley 21.719?`;
}

function buildLiteralQuestionText(article: string, literal: RequirementRow): string {
  const lit = literal.literal ? `literal ${literal.literal}` : 'disposición';
  const body = truncate(literal.title || literal.description || literal.legalText || '', 160);
  if (body) {
    return `${article} (${lit}): ¿cumple con «${body}»?`;
  }
  return `${article} (${lit}): ¿cumple con esta obligación específica?`;
}

export async function createChileanPrivacyArticleQuestionnaire(opts?: {
  replaceExisting?: boolean;
}) {
  await connectDBLocal();

  const dataPath = path.join(process.cwd(), 'data', 'chilean-privacy-requirements.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Requirements file not found: ${dataPath}`);
  }

  const pack = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const requirements: RequirementRow[] = pack.requirements || [];
  if (requirements.length === 0) {
    throw new Error('No requirements found in chilean-privacy-requirements.json');
  }

  const QuestionModel = isLocalStorage()
    ? getQuestionModel(RegulationType.CHILEAN_PRIVACY)
    : Question;

  if (opts?.replaceExisting) {
    const existing = await QuestionModel.find({ regulationType: RegulationType.CHILEAN_PRIVACY });
    for (const q of existing) {
      if (q.questionId?.startsWith('Q-PRIV-ART-')) {
        await QuestionModel.deleteOne({ questionId: q.questionId });
      }
    }
    console.log(`Cleared ${existing.filter((q: any) => q.questionId?.startsWith('Q-PRIV-ART-')).length} prior article questions`);
  }

  const byArticle = new Map<string, RequirementRow[]>();
  for (const req of requirements) {
    const art = req.article || 'Sin artículo';
    if (!byArticle.has(art)) byArticle.set(art, []);
    byArticle.get(art)!.push(req);
  }

  const articles = Array.from(byArticle.keys()).sort(
    (a, b) => articleSortKey(a) - articleSortKey(b)
  );

  let order = 1;
  let created = 0;
  let skipped = 0;
  let literalQs = 0;

  console.log(`\n📋 Building article questionnaire for ${articles.length} articles (${requirements.length} requirements)\n`);

  for (const article of articles) {
    const reqs = byArticle.get(article)!;
    const parents = reqs.filter((r) => isParentRequirement(r, reqs));
    const parent = parents[0] || reqs.find((r) => !r.literal) || reqs[0];

    // Literals / children that carry distinct obligations
    const literals = reqs.filter((r) => {
      if (r.requirementId === parent?.requirementId) return false;
      // Prefer rows with a literal letter, or explicit children
      return !!(r.literal || (r.parentRequirementId && r.level && r.level >= 1));
    });

    // Cap follow-ups: if many literals, keep those with letter labels first, max 6
    const literalFollowUps = literals
      .filter((r) => r.literal)
      .slice(0, 6);

    // If no lettered literals but many children, take up to 3 descriptive children
    const followUps =
      literalFollowUps.length > 0
        ? literalFollowUps
        : literals.length > 1
          ? literals.slice(0, 3)
          : [];

    const articleReqIds = reqs.map((r) => r.requirementId);
    const questionId = `Q-PRIV-ART-${slugArticle(article)}`;

    const articleQuestion = {
      questionId,
      text: buildArticleQuestionText(article, parent, reqs),
      type: QuestionType.YES_NO,
      options: YES_NO_OPTIONS,
      pillar: parent?.pillar || reqs[0]?.pillar || 'ACCOUNTABILITY',
      regulationType: RegulationType.CHILEAN_PRIVACY,
      article,
      requirementIds: articleReqIds,
      order: order++,
      isRequired: true,
    };

    try {
      const existing = await QuestionModel.findOne({ questionId });
      if (existing) {
        await QuestionModel.findOneAndUpdate({ questionId }, articleQuestion, { new: true });
        skipped++;
        console.log(`↻ ${questionId}`);
      } else {
        await QuestionModel.create(articleQuestion);
        created++;
        console.log(`✅ ${questionId}: ${articleQuestion.text.slice(0, 70)}…`);
      }
    } catch (err: any) {
      console.error(`❌ ${questionId}:`, err.message);
    }

    for (const lit of followUps) {
      const litSlug = (lit.literal || lit.nestedNumber || lit.requirementId.split('-').pop() || 'X')
        .toString()
        .toUpperCase();
      const litQId = `Q-PRIV-ART-${slugArticle(article)}-LIT-${litSlug}`;
      const litQuestion = {
        questionId: litQId,
        text: buildLiteralQuestionText(article, lit),
        type: QuestionType.YES_NO,
        options: YES_NO_OPTIONS,
        pillar: lit.pillar || parent?.pillar || 'ACCOUNTABILITY',
        regulationType: RegulationType.CHILEAN_PRIVACY,
        article,
        requirementIds: [lit.requirementId],
        order: order++,
        isRequired: true,
      };

      try {
        const existingLit = await QuestionModel.findOne({ questionId: litQId });
        if (existingLit) {
          await QuestionModel.findOneAndUpdate({ questionId: litQId }, litQuestion, { new: true });
        } else {
          await QuestionModel.create(litQuestion);
          created++;
        }
        literalQs++;
        console.log(`   ↳ ${litQId}`);
      } catch (err: any) {
        console.error(`   ❌ ${litQId}:`, err.message);
      }
    }
  }

  const all = await QuestionModel.find({ regulationType: RegulationType.CHILEAN_PRIVACY });
  const articleLevel = all.filter((q: any) => q.questionId?.startsWith('Q-PRIV-ART-') && !q.questionId.includes('-LIT-'));

  console.log(`\n📊 Summary`);
  console.log(`   Articles covered: ${articleLevel.length}`);
  console.log(`   Literal follow-ups: ${literalQs}`);
  console.log(`   Total CHILEAN_PRIVACY questions: ${all.length}`);
  console.log(`   Created this run: ${created} (updated/skipped: ${skipped})`);

  return {
    articles: articleLevel.length,
    literalQuestions: literalQs,
    total: all.length,
  };
}

if (require.main === module) {
  createChileanPrivacyArticleQuestionnaire({ replaceExisting: process.argv.includes('--replace') })
    .then(() => {
      console.log('\n✅ Article questionnaire ready');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Fatal:', err);
      process.exit(1);
    });
}
