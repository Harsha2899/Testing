const googleAppsScriptURL = "https://script.google.com/macros/s/AKfycbwMG4v2zDpvFYilhUIPDMN3Gd09CJxJf5gk6tzu0rJpOLtoRfcTubT1pAOXVxmNbsRR/exec";

let currentQuestionIndex = 0;
let questions = [];
let studentEmail = "";
let usedHint = false;
let followUpAnswered = false;
let correctAnswers = 0;
let incorrectAnswers = 0;
let quizStartTime = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("exerciseSelection").addEventListener("change", showEmailInput);
  document.getElementById("emailForm").addEventListener("submit", startQuiz);
  document.getElementById("submitAnswer").addEventListener("click", handleSubmitAnswer);
  document.getElementById("skipQuestion").addEventListener("click", markQuestionAsSkipped);
  document.getElementById("showHint").addEventListener("click", showHint);
  document.getElementById("prevQuestion").addEventListener("click", goToPreviousQuestion);
});

function showEmailInput() {
  const selected = document.getElementById("exerciseSelection").value;
  if (selected) {
    document.getElementById("homepage").style.display = "none";
    document.getElementById("emailScreen").style.display = "block";
  }
}

function startQuiz(e) {
  e.preventDefault();
  studentEmail = document.getElementById("studentEmail").value.trim();
  if (!studentEmail.endsWith("@gmail.com")) {
    alert("Please enter a valid Gmail address.");
    return;
  }
  const selected = document.getElementById("exerciseSelection").value;
  fetch("questions.json")
    .then(res => res.json())
    .then(data => {
      questions = data[selected];
      currentQuestionIndex = 0;
      quizStartTime = new Date();
      document.getElementById("emailScreen").style.display = "none";
      document.getElementById("quizScreen").style.display = "block";
      renderQuestion();
    });
}

function renderQuestion() {
  usedHint = false;
  followUpAnswered = false;
  const questionObj = questions[currentQuestionIndex];
  document.getElementById("questionNumber").textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
  document.getElementById("questionText").textContent = questionObj.question;
  document.getElementById("hintText").style.display = "none";
  document.getElementById("hintText").textContent = questionObj.hint;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  questionObj.options.forEach(opt => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="option" value="${opt}"> ${opt}`;
    optionsDiv.appendChild(label);
    optionsDiv.appendChild(document.createElement("br"));
  });
}

function handleSubmitAnswer() {
  const selectedOption = document.querySelector('input[name="option"]:checked');
  if (!selectedOption) {
    alert("Please select an answer.");
    return;
  }

  const questionObj = questions[currentQuestionIndex];
  const studentAnswer = selectedOption.value;
  const isCorrect = studentAnswer === questionObj.answer;

  const result = isCorrect ? "Correct" : "Incorrect";
  if (isCorrect) correctAnswers++;
  else incorrectAnswers++;

  const timeSpent = (new Date() - quizStartTime) / 1000;
  const feedback = isCorrect ? "Good job!" : `Correct answer is ${questionObj.answer}`;

  logAnswer({
    questionId: questionObj.id,
    questionText: questionObj.question,
    studentAnswer,
    correctAnswer: questionObj.answer,
    usedHint,
    followUpAnswer: "",
    followUpResult: "",
    timeSpent,
    result,
    feedback,
    section: questionObj.section || "",
    extra: ""
  });

  // If correct and has followUp question, show it next (once)
  if (isCorrect && questionObj.followUp && !followUpAnswered) {
    followUpAnswered = true;
    showFollowUp(questionObj);
    return;
  }

  goToNextQuestion();
}

function showFollowUp(questionObj) {
  document.getElementById("questionText").textContent = questionObj.followUp.question;
  document.getElementById("hintText").style.display = "none";
  document.getElementById("hintText").textContent = questionObj.followUp.hint;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  questionObj.followUp.options.forEach(opt => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="option" value="${opt}"> ${opt}`;
    optionsDiv.appendChild(label);
    optionsDiv.appendChild(document.createElement("br"));
  });

  document.getElementById("submitAnswer").onclick = () => {
    const selected = document.querySelector('input[name="option"]:checked');
    if (!selected) {
      alert("Please select an answer.");
      return;
    }

    const studentAnswer = selected.value;
    const isCorrect = studentAnswer === questionObj.followUp.answer;
    const timeSpent = (new Date() - quizStartTime) / 1000;
    const feedback = isCorrect ? "Good job!" : `Correct answer is ${questionObj.followUp.answer}`;
    if (isCorrect) correctAnswers++;
    else incorrectAnswers++;

    logAnswer({
      questionId: `${questionObj.id}-followup`,
      questionText: questionObj.followUp.question,
      studentAnswer,
      correctAnswer: questionObj.followUp.answer,
      usedHint,
      followUpAnswer: "",
      followUpResult: "",
      timeSpent,
      result: isCorrect ? "Correct" : "Incorrect",
      feedback,
      section: questionObj.section || "",
      extra: "Follow-up"
    });

    goToNextQuestion();
    document.getElementById("submitAnswer").onclick = handleSubmitAnswer;
  };
}

function markQuestionAsSkipped() {
  const questionObj = questions[currentQuestionIndex];
  const timeSpent = (new Date() - quizStartTime) / 1000;
  logAnswer({
    questionId: questionObj.id,
    questionText: questionObj.question,
    studentAnswer: "",
    correctAnswer: questionObj.answer,
    usedHint,
    followUpAnswer: "",
    followUpResult: "",
    timeSpent,
    result: "Skipped",
    feedback: "Skipped",
    section: questionObj.section || "",
    extra: ""
  });
  goToNextQuestion();
}

function showHint() {
  usedHint = true;
  document.getElementById("hintText").style.display = "block";
}

function goToNextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= questions.length) {
    showScore();
  } else {
    renderQuestion();
  }
}

function goToPreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function showScore() {
  document.getElementById("quizScreen").style.display = "none";
  document.getElementById("scoreScreen").style.display = "block";

  const total = questions.length;
  const finalScore = Math.round((correctAnswers / total) * 100);
  document.getElementById("finalScore").textContent = `Final Score: ${finalScore}%`;
  document.getElementById("correctCount").textContent = `Correct: ${correctAnswers}`;
  document.getElementById("incorrectCount").textContent = `Incorrect: ${incorrectAnswers}`;

  logFinalScore(finalScore);
}

function logAnswer(data) {
  const payload = {
    studentEmail,
    ...data
  };

  fetch(googleAppsScriptURL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.error("Log failed (network error or script issue):", err);
  });
}

function logFinalScore(score) {
  const timeSpent = (new Date() - quizStartTime) / 1000;
  logAnswer({
    questionId: "FINAL_SCORE",
    questionText: "Final score summary",
    studentAnswer: `${score}%`,
    correctAnswer: "",
    usedHint: "",
    followUpAnswer: "",
    followUpResult: "",
    timeSpent,
    result: `Final Score: ${score}%`,
    feedback: `Correct: ${correctAnswers}, Incorrect: ${incorrectAnswers}`,
    section: "",
    extra: ""
  });
}
