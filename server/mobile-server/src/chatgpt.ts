import { OngoingRecognizer } from './ongoing-recognizer';
import OpenAI from 'openai';
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

const apiKey = process.env.OPENAI_API_KEY ?? '';
const apiModel = process.env.OPENAI_API_MODEL;
const openAi = new OpenAI({apiKey});

const functions = [
  {
    "name": "createPrinterSupportTicket",
    "description": "Creates a support ticket for printer problems",
    "parameters": {
      "type": "object",
      "properties": {
        "brand": {
          "type": "string",
          "description": "the brand of the printer",
        },
        "turnedOn": {
          "type": "boolean",
          "description": "is printer turned on",
        },
        "deviceType": {
          "type": "string",
          "enum": ["computer", "laptop", "tablet", "smartphone"],
          "description": "the device the user wants to print from",
        },
      },
      "required": ["brand", "deviceType", "turnedOn"],
    },
  },
];

export function ask(recognizer: OngoingRecognizer, messages: ChatCompletionMessageParam[]) {
  const stream = openAi.beta.chat.completions.stream({
    model: apiModel as 'gpt-3.5-turbo',
    stream: true,
    messages,
    functions,
    function_call: 'auto',
  })
  stream.on('content', async (delta) => {
    recognizer.append(delta);
  })
  stream.on('finalFunctionCall', async (delta) => {
    console.log(delta)
  })
  stream.on('end', () => {
    recognizer.complete();
  });
  stream.on('error', err => {
    console.error(err)
  })
}
