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

async function imageUrlToDataUrl(url: string): Promise<string> {
  const FALLBACK_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23D4AF37"/><text x="50" y="62" font-size="42" text-anchor="middle" fill="%23031F33" font-family="sans-serif" font-weight="bold">V</text></svg>`;
  
  if (!url) return FALLBACK_LOGO_SVG;
  if (url.startsWith("data:")) return url;

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error("Fetch failed");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string' && reader.result.length > 100) {
          resolve(reader.result);
        } else {
          resolve(FALLBACK_LOGO_SVG);
        }
      };
      reader.onerror = () => resolve(FALLBACK_LOGO_SVG);
      reader.readAsDataURL(blob);
    });
  } catch {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 100;
          canvas.height = img.height || 100;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            if (dataUrl && dataUrl.length > 100) {
              resolve(dataUrl);
              return;
            }
          }
        } catch {
          // ignore tainted canvas
        }
        resolve(FALLBACK_LOGO_SVG);
      };
      img.onerror = () => resolve(FALLBACK_LOGO_SVG);
      img.src = url;
    });
  }
}

/**
 * Generates a beautiful premium PNG image Blob of a quiz item, branded with the App and Ministry logos.
 */
export async function generateQuizImageBlob(
  quiz: QuizInput,
  ministry?: MinistryInput
): Promise<Blob> {
  const defaultAppLogo = "https://i.ibb.co/FkGwqJVL/3-QCM-Ep4-1.jpg";
  const rawMinistryLogo = ministry?.logo || defaultAppLogo;

  // Convert logos to Data URLs to prevent CORS/tainted canvas errors in html-to-image / html2canvas
  const [appLogo, ministryLogo] = await Promise.all([
    imageUrlToDataUrl(defaultAppLogo),
    imageUrlToDataUrl(rawMinistryLogo)
  ]);

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
  card.style.position = "absolute";
  card.style.top = "-9999px";
  card.style.left = "-9999px";
  card.style.width = "620px";
  card.style.boxSizing = "border-box";
  card.style.opacity = "1";
  card.style.pointerEvents = "none";

  const escapeHTML = (unsafe?: string) => {
    if (!unsafe) return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // HTML and CSS Construction
  card.innerHTML = `
    <style>
      .quiz-card {
        font-family: system-ui, -apple-system, sans-serif, 'Khmer OS', 'Khmer OS System';
        background: linear-gradient(135deg, #094C72 0%, #031F33 100%);
        border: 2px solid #D4AF37;
        border-radius: 32px;
        padding: 44px;
        box-shadow: 0 30px 60px -12px rgba(3, 23, 37, 0.7);
        color: #F8FAFC;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        width: 620px;
      }
      
      /* Premium radial glow effect */
      .quiz-card::after {
        content: '';
        position: absolute;
        top: -150px;
        right: -150px;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%);
        pointer-events: none;
        z-index: 1;
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 2;
        border-bottom: 1.5px solid rgba(212, 175, 55, 0.2);
        padding-bottom: 24px;
        margin-bottom: 32px;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .app-logo-container {
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        border: 2px solid #D4AF37;
        background: #FFFFFF;
        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
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
        font-family: system-ui, -apple-system, sans-serif, 'Khmer OS', 'Khmer OS System';
        font-weight: 800;
        color: #FCECB8;
        font-size: 16px;
        line-height: 1.4;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .app-tagline {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 600;
        letter-spacing: 0.02em;
        margin-top: 2px;
      }
      
      .ministry-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(212, 175, 55, 0.15);
        border: 1px solid rgba(212, 175, 55, 0.3);
        padding: 8px 16px;
        border-radius: 14px;
        color: #FCECB8;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .ministry-logo {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: contain;
        background: white;
        padding: 1.5px;
      }
      
      .body-content {
        position: relative;
        z-index: 2;
      }
      
      .question-badge {
        background: #D4AF37;
        color: #031F33;
        font-family: system-ui, -apple-system, sans-serif, 'Khmer OS', 'Khmer OS System';
        font-weight: 800;
        font-size: 10px;
        padding: 5px 14px;
        border-radius: 8px;
        display: inline-block;
        margin-bottom: 16px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      
      .question-text {
        font-size: 19px;
        font-weight: 700;
        line-height: 1.7;
        color: #FFFFFF;
        margin-bottom: 28px;
        white-space: pre-wrap;
        text-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .options-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      
      .option-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      
      .option-item-correct {
        background: rgba(212, 175, 55, 0.12);
        border: 2px solid #D4AF37;
        box-shadow: 0 4px 20px rgba(212, 175, 55, 0.1);
      }
      
      .option-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1.5px solid rgba(255, 255, 255, 0.2);
        color: #F1F5F9;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .option-circle-correct {
        background: #D4AF37;
        border-color: #D4AF37;
        color: #031F33;
        box-shadow: 0 0 12px rgba(212, 175, 55, 0.4);
      }
      
      .option-text {
        font-size: 15px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      
      .option-text-correct {
        color: #FFFFFF;
        font-weight: 700;
      }

      .answer-container {
        background: rgba(212, 175, 55, 0.08);
        border-left: 5px solid #D4AF37;
        border-radius: 6px 18px 18px 6px;
        padding: 22px;
        margin-top: 12px;
        box-sizing: border-box;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }

      .answer-label {
        font-family: system-ui, -apple-system, sans-serif, 'Khmer OS', 'Khmer OS System';
        font-weight: 800;
        color: #FCECB8;
        font-size: 12px;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .answer-text {
        font-size: 15px;
        line-height: 1.7;
        color: #FFFFFF;
        white-space: pre-wrap;
      }
      
      .explanation-container {
        background: rgba(0, 0, 0, 0.15);
        border: 1.5px dashed rgba(212, 175, 55, 0.4);
        border-radius: 20px;
        padding: 24px;
        margin-top: 32px;
        box-sizing: border-box;
      }
      
      .explanation-header {
        font-family: system-ui, -apple-system, sans-serif, 'Khmer OS', 'Khmer OS System';
        font-weight: 800;
        color: #FCECB8;
        font-size: 12px;
        margin-bottom: 10px;
      }
      
      .explanation-body {
        font-size: 13px;
        line-height: 1.7;
        color: #94a3b8;
        font-style: italic;
        white-space: pre-wrap;
      }
      
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 2;
        margin-top: 36px;
        border-top: 1px solid rgba(212, 175, 55, 0.2);
        padding-top: 20px;
        font-size: 10px;
        color: rgba(203, 213, 225, 0.4);
        font-weight: 500;
      }
      
      .footer-tag {
        font-weight: 800;
        color: rgba(212, 175, 55, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.05em;
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
          <span>${escapeHTML(ministryName)}</span>
        </div>
      </div>
      
      <div class="body-content">
        <span class="question-badge">${isMcq ? "សំណួរពហុចម្លើយ" : "សំណួរចម្លើយខ្លី"}</span>
        <div class="question-text">${escapeHTML(quiz.question)}</div>
        
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
                  ${escapeHTML(opt.text)}
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
            <div class="answer-text">${escapeHTML(quiz.answer) || "សូមពិនិត្យការពន្យល់លម្អិតខាងក្រោម"}</div>
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
            <div class="explanation-body">${escapeHTML(quiz.explanation)}</div>
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
          img.onerror = () => resolve();
        });
      })
    );

    // Wait for layout and fonts
    await new Promise((resolve) => setTimeout(resolve, 500));

    let blob: Blob | null = null;
    const cardElement = (card.firstElementChild as HTMLElement) || card;

    try {
      if (cardElement) {
        const { toBlob } = await import('html-to-image');
        const b = await toBlob(cardElement, {
          pixelRatio: 2,
          skipFonts: true,
          cacheBust: true,
          backgroundColor: "#031F33",
        });
        if (b && b.size > 0) {
          blob = b;
        }
      }
    } catch (e1) {
      console.warn("html-to-image failed, falling back to html2canvas", e1);
    }

    if ((!blob || blob.size === 0) && cardElement) {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#031F33",
        width: 620,
      });
      
      blob = await new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob((b) => {
            if (b && b.size > 0) {
              resolve(b);
            } else {
              const dataUrl = canvas.toDataURL('image/png');
              if (!dataUrl || !dataUrl.includes(',')) {
                reject(new Error("Canvas generated invalid data URL"));
                return;
              }
              const arr = dataUrl.split(',');
              const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/png';
              const bstr = atob(arr[1] || "");
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const resBlob = new Blob([u8arr], { type: mime });
              resolve(resBlob);
            }
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      });
    }

    if (!blob || blob.size === 0) {
      console.warn("DOM snapshot failed or tainted, using robust canvas rendering fallback.");
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = 1240;
      fallbackCanvas.height = 1240;
      const ctx = fallbackCanvas.getContext("2d");
      if (ctx) {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 1240, 1240);
        grad.addColorStop(0, "#094C72");
        grad.addColorStop(1, "#031F33");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1240, 1240);

        // Gold border
        ctx.strokeStyle = "#D4AF37";
        ctx.lineWidth = 16;
        ctx.strokeRect(30, 30, 1180, 1180);

        // Header / Ministry badge
        ctx.fillStyle = "rgba(212, 175, 55, 0.15)";
        ctx.fillRect(60, 60, 1120, 100);
        ctx.fillStyle = "#FCECB8";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText(ministryName, 90, 124);

        // Question Type Tag
        ctx.fillStyle = "#D4AF37";
        ctx.fillRect(60, 200, 220, 56);
        ctx.fillStyle = "#031F33";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(quiz.type === "mcq" ? "សំណួរពហុជម្រើស" : "សំណួរអត្ថបទ", 85, 238);

        // Question text wrapping
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 42px sans-serif";
        const text = String(quiz.question || "សំណួរវិញ្ញាសា");
        const words = text.split(' ');
        let line = "";
        let testY = 320;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 1100 && i > 0) {
            ctx.fillText(line, 60, testY);
            line = words[i] + " ";
            testY += 60;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 60, testY);

        // Footer brand
        ctx.fillStyle = "rgba(212, 175, 55, 0.5)";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("© VIGNASA CAMBODIA • MINISTRY HUB", 60, 1160);

        blob = await new Promise<Blob>((resolve) => {
          fallbackCanvas.toBlob((b) => {
            if (b && b.size > 0) {
              resolve(b);
            } else {
              // Absolute fallback 1x1 transparent PNG if all else fails
              const tinyDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
              const arr = tinyDataUrl.split(',');
              const bstr = atob(arr[1] || "");
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) u8arr[n] = bstr.charCodeAt(n);
              resolve(new Blob([u8arr], { type: 'image/png' }));
            }
          }, 'image/png');
        });
      }
    }

    if (!blob || blob.size === 0) {
      throw new Error("Unable to capture non-empty image from DOM.");
    }

    return blob;
  } finally {
    if (document.body.contains(card)) {
      document.body.removeChild(card);
    }
  }
}

