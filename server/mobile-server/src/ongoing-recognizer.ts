
export interface OngoingRecognizer {
  append(text: string): void;
  complete(): void;
  end: Promise<void>;
}


export function createOngoingRecognizer(cb: (response: string) => void): OngoingRecognizer {
  let resolveFn: () => void;

  let currentValue = ''
  const end = new Promise<void>((resolve) => {
    resolveFn = resolve;
  })

  return {
    append(text: string) {
      const newText = currentValue + text;
      const cs = /([a-zA-Z][a-zA-Z](\?|\!|\.) |[\r\n]+)/g;
      const match = cs.exec(newText)
      if (match) {
        const value = newText.substring(0, match.index + 3).trim()
        if (value && value.length > 0) {
          cb(value)
        }
        currentValue = newText.substring(match.index + 3)
      } else {
        currentValue = newText
      }
    },
    complete() {
      if (currentValue.length > 0) {
        cb(currentValue.trim())
      }
      resolveFn();
    },
    end,
  }
}
