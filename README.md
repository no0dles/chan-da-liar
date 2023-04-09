# ChanDaLiar
Connect OpenAI with Azure Cognitive services and create the speaking ChanDaLiar.
Hosted demo can be viewed here https://chan-da-liar.vercel.app/

## Start development
```
npm install
npm start
```

## Configuration

### Devices
Allow audio permissions, select the output channel and which microphone should be used for input.

### Azure Cognitive
Create an account and create a speech service subscription [here](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices).
Select a region with support for [speak recognition](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/regions). 
Would recommend westeurope.
Check the "Keys and Endpoint" page for KEY1 or KEY2. If there are troubles with setting up, regenerating keys may help. 

### OpenAI
Create an account with billing information and create an API Key [here](https://platform.openai.com/account/api-keys)

## Code overview
Code is seperated into two main directories.
- Components in `src/app/components` are for visual UI elements
- State services in `src/app/states` contain persistent application state

### Generate code

#### Services
```
npx ng g s <name>
```

#### Components
```
npx ng g c <name>
```
