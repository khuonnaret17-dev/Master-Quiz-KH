import { Quiz } from './types';

/**
 * Parses questions from a bulk text format.
 * Format examples:
 * 
 * ១. អ្នកកាត់សេចក្ដីត្រូវវាសចាកនៅអគតិធម៌ប៉ុន្មានយ៉ាង?
 *   ក. ២យ៉ាង
 *   ខ. ៣យ៉ាង
 *   គ. ៤យ៉ាង (ចម្លើយត្រឹមត្រូវ)
 *   ឃ. ៥យ៉ាង
 * 
 * 1. She asked Steve … her urgently.
 * a. calling
 * b. call
 * c. to call (T)
 */
export function parseBulkQuizzes(text: string, category: string = 'ចំណេះដឹងទូទៅ'): Quiz[] {
  const lines = text?.split('\n');
  const quizzes: Quiz[] = [];
  let currentQuiz: Partial<Quiz> | null = null;
  let optionsCount = 0;

  const khmerToLatin: Record<string, string> = { 'ក': 'A', 'ខ': 'B', 'គ': 'C', 'ឃ': 'D' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect new question: Number flowered by . or ) or just text if it looks like a question
    // Regex for: 1. or ១. or (1) or (១)
    const questionMatch = line.match(/^(\d+|[១-៩]+)[\.\)](.*)/) || line.match(/^\(([\d]+|[១-៩]+)\)(.*)/);

    if (questionMatch) {
      // If we had a previous quiz, push it
      if (currentQuiz && currentQuiz.question) {
        quizzes.push(currentQuiz as Quiz);
      }

      currentQuiz = {
        id: Math.random().toString(36).substr(2, 9),
        category: category,
        question: questionMatch[2].trim(),
        options: { "A": "", "B": "", "C": "", "D": "" },
        correctAnswer: "A",
        explanation: ""
      };
      optionsCount = 0;
      continue;
    }

    // Detect options: markers followed by . or )
    // Regex for: ក. or A. or a. or (A)
    const optionMatch = line.match(/^([ក-ឃA-Za-z])[\.\)](.*)/) || line.match(/^\(([ក-ឃA-Za-z])\)(.*)/);

    if (optionMatch && currentQuiz) {
      let marker = optionMatch[1].toUpperCase();
      // Map Khmer to Latin keys
      if (khmerToLatin[marker]) marker = khmerToLatin[marker];
      // Normalize lowercase to uppercase
      if (marker >= 'A' && marker <= 'D') {
        const optionTextRaw = optionMatch[2].trim();
        
        // Check if this is the correct answer
        const isCorrect = optionTextRaw.includes('(ចម្លើយត្រឹមត្រូវ)') || 
                         optionTextRaw.includes('(T)') || 
                         optionTextRaw.includes('(Correct)');
        
        const cleanOptionText = optionTextRaw
          .replace('(ចម្លើយត្រឹមត្រូវ)', '')
          .replace('(T)', '')
          .replace('(Correct)', '')
          .trim();

        currentQuiz.options = {
          ...currentQuiz.options!,
          [marker]: cleanOptionText
        };

        if (isCorrect) {
          currentQuiz.correctAnswer = marker;
        }
        
        optionsCount++;
      }
    } else if (currentQuiz && !optionMatch && !questionMatch) {
      // If it's a line after a question but not an option, it might be part of the question
      if (optionsCount === 0) {
        currentQuiz.question += ' ' + line;
      }
    }
  }

  // Push the last one
  if (currentQuiz && currentQuiz.question) {
    quizzes.push(currentQuiz as Quiz);
  }

  return quizzes;
}
