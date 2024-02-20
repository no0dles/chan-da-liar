import { createOngoingRecognizer } from './ongoing-recognizer';

function test(text: string, expected: string[]) {
  const results: string[] = [];
  const recognizer = createOngoingRecognizer((response) => {
    results.push(response);
  });
  for (const c of text) {
    recognizer.append(c);
  }
  recognizer.complete();
  expect(results).toEqual(expected);
}

describe('ongoing-recognizer', () => {
  it('should not split words', () => {
    test('hello world', ['hello world']);
  });
  it('should split sentences', () => {
    test('hello, how are you? Can I help?', ['hello, how are you?', 'Can I help?']);
  });
  it('should split z.B', () => {
    test('z.B. sollte', ['z.B. sollte']);
  });
  it('shoud not split lists', () => {
    test('Insbesondere wäre es nützlich zu wissen:\n' +
      '\n' +
      '1. Was genau funktioniert nicht wie gewünscht auf Ihrem Handy?\n' +
      '2. Welches Handymodell verwenden Sie?',

      [
        'Insbesondere wäre es nützlich zu wissen:',
        '1. Was genau funktioniert nicht wie gewünscht auf Ihrem Handy?',
        '2. Welches Handymodell verwenden Sie?',
      ]);
  });
});
