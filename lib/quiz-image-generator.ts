import { domToBlob } from "modern-screenshot";

interface QuizInput {
  question: string;
  type?: "mcq" | "qa";
  options?: string[] | Record<string, string>;
  correctIndex?: number;
  correctAnswer?: string;
  answer?: string;
  explanation?: string;
}

interface MinistryInput {
  khmerName?: string;
  name?: string;
  logo?: string;
}

/**
 * Generates a beautiful premium PNG image Blob of a quiz item, branded with the App and Ministry logos.
 */
export async function generateQuizImageBlob(
  quiz: QuizInput,
  ministry?: MinistryInput
): Promise<Blob> {
  const appLogo = "https://i.ibb.co/FkGwqJVL/3-QCM-Ep4-1.jpg";
  const ministryLogo = ministry?.logo || appLogo;
  const ministryName = ministry?.khmerName || ministry?.name || "វិញ្ញាសាទូទៅ";

  // Determine type
  const isMcq =
    quiz.type === "mcq" ||
    (quiz.options &&
      (Array.isArray(quiz.options)
        ? quiz.options.length > 0
        : Object.keys(quiz.options).length > 0));

  // Parse options
  let parsedOptions: { label: string; text: string; isCorrect: boolean }[] = [];
  if (isMcq && quiz.options) {
    if (Array.isArray(quiz.options)) {
      const labels = ["ក", "ខ", "គ", "ឃ", "ង", "ច", "ឆ"];
      parsedOptions = quiz.options
        .filter((opt) => opt && opt.trim() !== "")
        .map((opt, idx) => ({
          label: labels[idx] || String.fromCharCode(65 + idx),
          text: opt,
          isCorrect: quiz.correctIndex === idx,
        }));
    } else if (typeof quiz.options === "object") {
      const entries = Object.entries(quiz.options);
      parsedOptions = entries.map(([key, val]) => {
        let displayLabel = key;
        if (key === "A") displayLabel = "ក";
        else if (key === "B") displayLabel = "ខ";
        else if (key === "C") displayLabel = "គ";
        else if (key === "D") displayLabel = "ឃ";

        return {
          label: displayLabel,
          text: val,
          isCorrect: quiz.correctAnswer === key,
        };
      });
    }
  }

  // Create card container
  const card = document.createElement("div");
  card.style.position = "fixed";
  card.style.top = "-9999px";
  card.style.left = "-9999px";
  card.style.width = "620px";
  card.style.boxSizing = "border-box";
  card.style.zIndex = "-9999";

  // HTML and CSS Construction
  card.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,300..700;1,300..700&family=Moul&family=Nokora:wght@400;700&display=swap');
      
      .quiz-card {
        font-family: 'Kantumruy Pro', 'Nokora', sans-serif;
        background: linear-gradient(135deg, #094C72 0%, #04253a 100%);
        border: 4px double #D4AF37;
        border-radius: 28px;
        padding: 40px;
        box-shadow: 0 25px 50px -12px rgba(3, 23, 37, 0.6);
        color: #F8FAFC;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        width: 100%;
      }
      
      /* Subtle premium gold ornament grid watermark */
      .quiz-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 0L30 15L15 30L0 15Z' fill='%23D4AF37' fill-opacity='0.02'/%3E%3C/svg%3E");
        pointer-events: none;
        opacity: 0.8;
      }

      .quiz-card::after {
        content: '';
        position: absolute;
        top: -150px;
        right: -150px;
        width: 350px;
        height: 350px;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%);
        pointer-events: none;
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 2;
        border-bottom: 2px solid rgba(212, 175, 55, 0.15);
        padding-bottom: 20px;
        margin-bottom: 28px;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      
      .app-logo-container {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 2px solid #D4AF37;
        background: #FFFFFF;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .app-logo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .brand-info {
        display: flex;
        flex-direction: column;
      }
      
      .app-name {
        font-family: 'Moul', serif;
        color: #FCECB8;
        font-size: 15px;
        line-height: 1.5;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      .app-tagline {
        font-size: 10px;
        color: #cbd5e1;
        font-weight: 500;
        letter-spacing: 0.03em;
        margin-top: 2px;
      }
      
      .ministry-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(212, 175, 55, 0.1);
        border: 1px solid rgba(212, 175, 55, 0.25);
        padding: 6px 14px;
        border-radius: 12px;
        color: #FCECB8;
        font-size: 11px;
        font-weight: bold;
        box-shadow: inset 0 0 10px rgba(212,175,55,0.05);
      }

      .ministry-logo {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: contain;
        background: white;
        padding: 1px;
      }
      
      .body-content {
        position: relative;
        z-index: 2;
      }
      
      .question-badge {
        background: #D4AF37;
        color: #031F33;
        font-family: 'Moul', serif;
        font-size: 10px;
        padding: 4px 12px;
        border-radius: 6px;
        display: inline-block;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .question-text {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.8;
        color: #FFFDF6;
        margin-bottom: 24px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        white-space: pre-wrap;
      }
      
      .options-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .option-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        box-sizing: border-box;
      }
      
      .option-item-correct {
        background: rgba(212, 175, 55, 0.09);
        border: 1.5px solid rgba(212, 175, 55, 0.6);
        box-shadow: 0 0 15px rgba(212, 175, 55, 0.05);
      }
      
      .option-circle {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #E2E8F0;
        font-weight: 800;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .option-circle-correct {
        background: #D4AF37;
        border-color: #D4AF37;
        color: #031F33;
        box-shadow: 0 0 8px rgba(212,175,55,0.4);
      }
      
      .option-text {
        font-size: 14px;
        line-height: 1.7;
        color: #E2E8F0;
      }
      
      .option-text-correct {
        color: #FFFDF6;
        font-weight: bold;
      }

      .answer-container {
        background: rgba(212, 175, 55, 0.05);
        border-left: 4px solid #D4AF37;
        border-radius: 4px 14px 14px 4px;
        padding: 18px;
        margin-top: 10px;
        box-sizing: border-box;
      }

      .answer-label {
        font-family: 'Moul', serif;
        color: #FCECB8;
        font-size: 11px;
        margin-bottom: 6px;
      }

      .answer-text {
        font-size: 14px;
        line-height: 1.8;
        color: #FFFDF6;
        white-space: pre-wrap;
      }
      
      .explanation-container {
        background: rgba(255, 255, 255, 0.01);
        border: 1.5px dashed rgba(212, 175, 55, 0.3);
        border-radius: 18px;
        padding: 20px;
        margin-top: 28px;
        box-sizing: border-box;
        position: relative;
      }
      
      .explanation-header {
        font-family: 'Moul', serif;
        color: #FCECB8;
        font-size: 11px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .explanation-body {
        font-size: 12px;
        line-height: 1.8;
        color: #cbd5e1;
        font-style: italic;
        white-space: pre-wrap;
      }
      
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 2;
        margin-top: 32px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 16px;
        font-size: 9px;
        color: rgba(255, 255, 255, 0.35);
        letter-spacing: 0.05em;
      }
      
      .footer-tag {
        font-weight: 700;
        text-transform: uppercase;
      }
    </style>
    
    <div class="quiz-card">
      <div class="header">
        <div class="header-left">
          <div class="app-logo-container">
            <img class="app-logo" src="${appLogo}" alt="App Logo" crossorigin="anonymous" />
          </div>
          <div class="brand-info">
            <span class="app-name">កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ</span>
            <span class="app-tagline">វិញ្ញាសា និងគន្លឹះដោះស្រាយផ្លូវការ</span>
          </div>
        </div>
        
        <div class="ministry-badge">
          <img class="ministry-logo" src="${ministryLogo}" alt="Ministry Logo" crossorigin="anonymous" />
          <span>${ministryName}</span>
        </div>
      </div>
      
      <div class="body-content">
        <span class="question-badge">${isMcq ? "សំណួរពហុចម្លើយ" : "សំណួរចម្លើយខ្លី"}</span>
        <div class="question-text">${quiz.question}</div>
        
        ${
          isMcq
            ? `
          <div class="options-grid">
            ${parsedOptions
              .map(
                (opt) => `
              <div class="option-item ${opt.isCorrect ? "option-item-correct" : ""}">
                <div class="option-circle ${opt.isCorrect ? "option-circle-correct" : ""}">
                  ${opt.label}
                </div>
                <div class="option-text ${opt.isCorrect ? "option-text-correct" : ""}">
                  ${opt.text}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : `
          <div class="answer-container">
            <div class="answer-label">ចម្លើយត្រឹមត្រូវ</div>
            <div class="answer-text">${quiz.answer || "សូមពិនិត្យការពន្យល់លម្អិតខាងក្រោម"}</div>
          </div>
        `
        }
        
        ${
          quiz.explanation && quiz.explanation.trim() !== ""
            ? `
          <div class="explanation-container">
            <div class="explanation-header">
              <span>💡 ការពន្យល់ និងឯកសារយោង</span>
            </div>
            <div class="explanation-body">${quiz.explanation}</div>
          </div>
        `
            : ""
        }
      </div>
      
      <div class="footer">
        <div class="footer-tag">© Vignasa Cambodia • App Platform</div>
        <div>ព័ត៌មានលម្អិត និងវិញ្ញាសាជាច្រើនទៀតមាននៅក្នុងកម្មវិធី</div>
      </div>
    </div>
  `;

  // Append to DOM
  document.body.appendChild(card);

  try {
    // Wait for images inside the card to load
    const imgs = Array.from(card.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // continue even if error
        });
      })
    );

    // Wait a short fraction of time for Google Fonts to ensure perfect text layout
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Screenshot using modern-screenshot
    // We wait for a bit more for fonts and layout to stabilize
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Ensure the card has a concrete height before capturing
    const rect = card.getBoundingClientRect();
    
    const blob = await domToBlob(card, {
      scale: 2.5, // Even higher quality
      backgroundColor: "transparent",
      width: 620,
      height: card.scrollHeight || rect.height,
      style: {
        transform: "none",
        position: "relative",
        top: "0",
        left: "0",
        display: "block",
        margin: "0",
        padding: "0",
      },
    });

    if (!blob) {
      throw new Error("Unable to capture image from DOM.");
    }

    return blob;
  } finally {
    // Clean up
    if (document.body.contains(card)) {
      document.body.removeChild(card);
    }
  }
}
