const transcriptText =
  "სხდომის აუდიო იტვირთება, AI ამოიცნობს ქართულ ტექსტს, იურისტი ადგილზე ასწორებს ჩანაწერს და ერთ დაწკაპებაში ქმნის Word დოკუმენტს.";

const typingLine = document.getElementById("typing-line");
let charIndex = 0;

function typeTranscript() {
  if (!typingLine) return;

  if (charIndex <= transcriptText.length) {
    typingLine.textContent = transcriptText.slice(0, charIndex);
    charIndex += 1;
    window.setTimeout(typeTranscript, 26);
  }
}

typeTranscript();
