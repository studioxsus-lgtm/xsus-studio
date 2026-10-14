// services/quiz-service.js

const quizQuestions = [
    {
        category: "Gjeografi",
        question: "Cili është kryeqyteti i Belgjikës?",
        options: ["A) Paris", "B) Brukseli", "C) Amsterdami", "D) Berlini"],
        answer: "B",
        explanation: "Brukseli është kryeqyteti i Belgjikës dhe qendra kryesore e Bashkimit Evropian."
    },
    {
        category: "Teknologji",
        question: "Çfarë do të thotë akronimi 'AI' në gjuhën angleze?",
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
        question: "Cila është planeti më i madh në sistemin tonë diellor?",
        options: ["A) Marsi", "B) Toka", "C) Jupiteri", "D) Saturni"],
        answer: "C",
        explanation: "Jupiteri është planeti më i madh në sistemin diellor."
    }
];

export async function checkQuiz(userQuery) {
    if (!userQuery) return null;

    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // Kontrollojmë fjalët kyçe për kuis
    const isQuizRequest = lowerQuery.includes("kuis") || 
                          lowerQuery.includes("quiz") || 
                          lowerQuery.includes("pyetje diturie") || 
                          lowerQuery.includes("pyetje kuis");

    if (!isQuizRequest) return null;

    // Zgjedhim një pyetje rastësore nga lista
    const randomIndex = Math.floor(Math.random() * quizQuestions.length);
    const q = quizQuestions[randomIndex];

    return `❓ **Pyetje Kuis [${q.category}]**\n\n**${q.question}**\n\n${q.options.join("\n")}\n\n---\n💡 *Përgjigju me shkronjën përkatëse (p.sh. B) ose kërko një pyetje tjetër me 'Kuis'!*`;
}
