// services/quiz-service.js

const quizQuestions = [
    {
        category: "Gjeografi",
        question: "Cili është kryeqyteti i Belgjikës?",
        options: ["A) Paris", "B) Brukseli", "C) Amsterdami", "D) Berlini"],
        answer: "B",
        explanation: "Brukseli është kryeqyteti i Belgjikës dhe qendra kryesore e BE-së."
    },
    {
        category: "Teknologji",
        question: "Çfarë do të thotë akronimi 'AI' në teknologji?",
        options: ["A) Automated Interface", "B) Artificial Intelligence", "C) Advanced Internet", "D) Access Information"],
        answer: "B",
        explanation: "AI do të thotë 'Artificial Intelligence' (Inteligjenca Artificiale)."
    },
    {
        category: "Sport",
        question: "Sa lojtarë ka një ekip futbolli në fushë gjatë lojës?",
        options: ["A) 9", "B) 10", "C) 11", "D) 12"],
        answer: "C",
        explanation: "Një ekip futbolli përbëhet nga 11 lojtarë në fushë, përfshirë portierin."
    },
    {
        category: "Dituri e Përgjithshme",
        question: "Cili është planeti më i madh në sistemin tonë diellor?",
        options: ["A) Marsi", "B) Toka", "C) Jupiteri", "D) Saturni"],
        answer: "C",
        explanation: "Jupiteri është planeti më i madh në sistemin diellor."
    }
];

export async function checkQuiz(userQuery) {
    if (!userQuery) return null;

    const lowerQuery = userQuery.trim().toLowerCase();

    // Kontrollojmë fjalët kyçe për kuis
    const isQuizRequest = lowerQuery.includes("kuis") || 
                          lowerQuery.includes("quiz") || 
                          lowerQuery.includes("pyetje diturie") || 
                          lowerQuery.includes("pyetje kuis") ||
                          lowerQuery.includes("pyetje");

    if (!isQuizRequest) return null;

    // Zgjedhim një pyetje rastësore
    const randomIndex = Math.floor(Math.random() * quizQuestions.length);
    const q = quizQuestions[randomIndex];

    return `❓ **Pyetje Kuis [${q.category}]**\n\n**${q.question}**\n\n${q.options.join("\n")}\n\n---\n💡 *Përgjigju me shkronjën përkatëse (A, B, C, ose D) ose kërko 'kuis' për pyetjen tjetër!*`;
}
