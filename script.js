let questions = [];
let currentQuestionIndex = 0;
let userEmail = "";
let usedHint = false;
let followUpAnswered = new Set();
let answeredQuestions = new Set();
let correctCount = 0;
let incorrectCount = 0;
let selectedSectionQuestions = [];
let currentSessionId = "";

const googleAppsScriptURL = "https://script.google.com/macros/s/AKfycbwMG4v2zDpvFYilhUIPDMN3Gd09CJxJf5gk6tzu0rJpOLtoRfcTubT1pAOXVxmNbsRR/exec";

document.addEventListener("DOMContentLoaded", () => {
  fetch("questions.json")
    .then(res => res.json())
    .then(data => {
      questions = data;
      showSectionList();
    })
    .catch(err => console.error("Failed to load questions.json:", err));

  document.getElementById("startButton").addEventListener("click", () => {
    userEmail = document.getElementById("emailInput").value.trim();
    if (userEmail && userEmail.includes("@")) {
      currentSessionId = Date.now().toString();
      questions = selectedSectionQuestions;
      if (questions.length > 0) {
        showQuestion(currentQuestionIndex);
      } else {
        alert("No questions found for this section.");
        document.getElementById("emailScreen").style.display = "none";
        document.getElementById("home").style.display = "block";
      }
    } else {
      alert("Please enter a valid Gmail address.");
    }
  });

  document.getElementById("showHint").addEventListener("click", () => {
    if (!answeredQuestions.has(currentQuestionIndex)) {
      const q = questions[currentQuestionIndex];
      document.getElementById("hintBox").innerText = q.hint || "";
      document.getElementById("hintBox").classList.add("hint-box");
      usedHint = true;
    }
  });

  document.getElementById("prevButton").addEventListener("click", () => {
    if (!answeredQuestions.has(currentQuestionIndex) && currentQuestionIndex > 0) {
      markQuestionAsSkipped(currentQuestionIndex);
    }
    if (currentQuestionIndex > 0) {
      showQuestion(--currentQuestionIndex);
    }
  });

  document.getElementById("nextButton").addEventListener("click", () => {
    if (!answeredQuestions.has(currentQuestionIndex)) {
      markQuestionAsSkipped(currentQuestionIndex);
    }
    if (currentQuestionIndex < questions.length - 1) {
      showQuestion(++currentQuestionIndex);
    } else {
      showScore();
    }
  });
});

function showSectionList() {
  const sectionContainer = document.getElementById("sectionList");
  const uniqueSections = [...new Set(questions.map(q => q.section))].sort((a, b) => a - b);
  const sectionNames = {
    1: "Subject-Verb Agreement",
    2: "Complete Sentences",
    3: "Sentence Fragments",
    4: "What is a Run-on Sentence",
    5: "How to fix Run-on Sentence",
    6: "Pronoun Agreement"
  };

  sectionContainer.innerHTML = "";
  uniqueSections.forEach(section => {
    const btn = document.createElement("button");
    btn.className = "section-button";
    btn.innerText = sectionNames[section] || `Section ${section}`;
    btn.onclick = () => {
      selectedSectionQuestions = questions.filter(q => q.section === section);
      currentQuestionIndex = 0;
      answeredQuestions.clear();
      correctCount = 0;
      incorrectCount = 0;
      followUpAnswered.clear();

      selectedSectionQuestions.forEach(q => {
        delete q.userSelectedAnswer;
        delete q.wasCorrectLastTime;
        delete q.lastFeedbackText;
        delete q.followUpNeeded;
        delete q.followUpAnsweredThisTime;
        delete q.lastFollowUpFeedbackText;
        delete q.lastFollowUpAnswerWasCorrect;
        delete q.userSelectedFollowUpAnswer;
        q.startTime = null;
        q.endTime = null;
      });

      document.getElementById("home").style.display = "none";
      document.getElementById("emailScreen").style.display = "block";
    };
    sectionContainer.appendChild(btn);
  });
}

function showQuestion(index) {
  const q = questions[index];
  usedHint = false;
  q.startTime = new Date();

  document.getElementById("emailScreen").style.display = "none";
  document.getElementById("scoreScreen").style.display = "none";
  document.getElementById("questionScreen").style.display = "block";

  document.getElementById("questionNumber").innerText = `Question ${index + 1} of ${questions.length}`;
  document.getElementById("questionText").innerText = q.question;

  const hintBox = document.getElementById("hintBox");
  hintBox.innerText = "";
  hintBox.classList.remove("hint-box");

  const feedbackBox = document.getElementById("feedback");
  feedbackBox.innerText = "";
  feedbackBox.classList.remove("correct", "incorrect");

  const followUpContainer = document.getElementById("followUpContainer");
  followUpContainer.innerHTML = "";
  followUpContainer.style.display = "none";

  const optionsBox = document.getElementById("optionsBox");
  optionsBox.innerHTML = "";
  q.options.forEach((opt, i) => {
    const optionId = `option_${q.id}_${i}`;
    const label = document.createElement("label");
    label.setAttribute("for", optionId);

    const radioInput = document.createElement("input");
    radioInput.type = "radio";
    radioInput.name = "option";
    radioInput.id = optionId;
    radioInput.value = String.fromCharCode(65 + i);
    radioInput.addEventListener("click", () => handleSubmitAnswer(radioInput.value));

    label.appendChild(radioInput);
    label.append(` ${opt}`);
    optionsBox.appendChild(label);
  });

  const isQuestionAnswered = answeredQuestions.has(index);
  document.getElementById("showHint").disabled = isQuestionAnswered;
  document.getElementById("prevButton").disabled = index === 0;
  document.getElementById("nextButton").disabled = false;

  if (isQuestionAnswered) {
    document.querySelectorAll("input[name='option']").forEach(radio => {
      if (radio.value === q.userSelectedAnswer) radio.checked = true;
      radio.disabled = true;
    });

    feedbackBox.innerText = q.lastFeedbackText;
    feedbackBox.classList.add(q.wasCorrectLastTime ? "correct" : "incorrect");
    if (q.followUpNeeded) showFollowUp(q, true);
  }
}

function showFollowUp(q, isRevisit = false) {
  const followUp = document.getElementById("followUpContainer");
  const followUpQuestionText = q.followUpCorrect || q.followUpQuestion;
  const followUpOptions = q.followUpCorrectOptions || q.followUpOptions;
  followUp.innerHTML = `<p>${followUpQuestionText}</p>`;

  followUpOptions.forEach((opt, i) => {
    const optionId = `followup_${q.id}_${i}`;
    const label = document.createElement("label");
    label.setAttribute("for", optionId);

    const radioInput = document.createElement("input");
    radioInput.type = "radio";
    radioInput.name = "followUp";
    radioInput.id = optionId;
    radioInput.value = String.fromCharCode(65 + i);
    radioInput.addEventListener("click", () => handleSubmitFollowUp(radioInput.value, q, followUp));

    label.appendChild(radioInput);
    label.append(` ${opt}`);
    followUp.appendChild(label);

    if (isRevisit && q.followUpAnsweredThisTime) {
      if (radioInput.value === q.userSelectedFollowUpAnswer) radioInput.checked = true;
      radioInput.disabled = true;
    }
  });

  followUp.style.display = "block";
  if (isRevisit && q.followUpAnsweredThisTime) {
    const feedbackParagraph = document.createElement("p");
    feedbackParagraph.innerText = q.lastFollowUpFeedbackText;
    feedbackParagraph.classList.add(q.lastFollowUpAnswerWasCorrect ? "correct" : "incorrect");
    followUp.appendChild(feedbackParagraph);
  }
}

// Remaining functions unchanged (handleSubmitAnswer, handleSubmitFollowUp, markQuestionAsSkipped, showScore, logAnswer, logFinalScore)

