/**
 * Azure SaaS deployment skeleton for Nexus Privacy (shared multitenant instance).
 *
 * Resources:
 * - Resource group
 * - App Service (Linux, Node) — Next.js app
 * - Azure Cosmos DB API for MongoDB (or swap connection to Atlas)
 * - Storage Account + Blob container for evidence
 * - Key Vault for secrets
 * - Application Insights
 *
 * Deploy:
 *   az group create -n rg-nexus-privacy-demo -l chilecentral
 *   az deployment group create \
 *     -g rg-nexus-privacy-demo \
 *     -f infra/azure/main.bicep \
 *     -p appName=nexus-privacy-demo
 */

param appName string = 'nexus-privacy'
param location string = resourceGroup().location
param skuName string = 'B1'
param mongoConnectionString string = '' // leave empty to create Cosmos Mongo; or pass Atlas URI
param createCosmos bool = true

var webAppName = '${appName}-web'
var planName = '${appName}-plan'
var storageName = take(replace('${appName}stg${uniqueString(resourceGroup().id)}', '-', ''), 24)
var cosmosName = '${appName}-cosmos'
var kvName = take('${appName}-kv-${uniqueString(resourceGroup().id)}', 24)
var insightsName = '${appName}-insights'
var evidenceContainer = 'evidence'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
    tier: skuName == 'B1' ? 'Basic' : 'Standard'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource evidence 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: evidenceContainer
  properties: {
    publicAccess: 'None'
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = if (createCosmos) {
  name: cosmosName
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
      { name: 'EnableMongo' }
    ]
    apiProperties: {
      serverVersion: '4.2'
    }
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: insightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForTemplateDeployment: true
  }
}

resource web 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: skuName != 'F1' && skuName != 'D1'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'JWT_SECRET'
          value: 'CHANGE_ME_USE_KEYVAULT'
        }
        {
          name: 'JWT_EXPIRE'
          value: '30d'
        }
        {
          name: 'MONGODB_URI'
          value: !empty(mongoConnectionString) ? mongoConnectionString : 'SET_AFTER_COSMOS_KEYS'
        }
        {
          name: 'USE_LOCAL_STORAGE'
          value: 'false'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'SET_FROM_STORAGE_KEYS'
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: evidenceContainer
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: insights.properties.ConnectionString
        }
        {
          name: 'TEST_MODE'
          value: 'false'
        }
      ]
    }
  }
}

output webAppName string = web.name
output webAppUrl string = 'https://${web.properties.defaultHostName}'
output storageAccountName string = storage.name
output evidenceContainerName string = evidenceContainer
output keyVaultName string = kv.name
output cosmosAccountName string = createCosmos ? cosmosName : ''
output nextSteps string = '1) az webapp deployment source config-zip ... 2) set MONGODB_URI + AZURE_STORAGE_CONNECTION_STRING from keys 3) npm run seed:chile-demo against prod with demo flags off for platform user only'
