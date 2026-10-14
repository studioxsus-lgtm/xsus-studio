// services/notes-service.js

export async function checkNotes(userQuery) {
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // 1. Shfaqja e shënimeve (p.sh. "shfaq shënimet", "show notes", "mes notes")
    const isShowRequest = [
        "shfaq shënimet", "shënimet e mia", "trego shënimet",
        "show notes", "my notes", "list notes",
        "afficher les notes", "mes notes"
    ].some(phrase => lowerQuery.includes(phrase));

    if (isShowRequest) {
        return getStoredNotes(lowerQuery);
    }

    // 2. Ruajtja e një shënimi të ri (p.sh. "ruaj shënimin: Blej qumësht" ose "save note: ...")
    const savePrefixes = [
        "ruaj shënimin:", "shto shënim:", "shëno:",
        "save note:", "add note:", "note:",
        "enregistrer la note:", "note:"
    ];

    for (const prefix of savePrefixes) {
        if (lowerQuery.startsWith(prefix)) {
            const noteContent = query.substring(prefix.length).trim();
            if (!noteContent) {
                return lowerQuery.includes("fr") ? "_Veuillez écrire le contenu de la note._" :
                       lowerQuery.includes("sq") ? "_Ju lutem shkruani përmbajtjen e shënimit._" :
                       "_Please write the content of the note._";
            }
            
            saveNoteToStorage(noteContent);

            const isSq = lowerQuery.includes("shënim") || lowerQuery.includes("ruaj");
            const isFr = lowerQuery.includes("note") || lowerQuery.includes("enregistrer");

            return isSq ? `✅ **Shënimi u ruajt me sukses:**\n"${noteContent}"` :
                   isFr ? `✅ **Note enregistrée avec succès:**\n"${noteContent}"` :
                          `✅ **Note saved successfully:**\n"${noteContent}"`;
        }
    }

    // 3. Fshirja e shënimeve (p.sh. "fshi shënimet", "clear notes")
    const isClearRequest = [
        "fshi shënimet", "fshi gjithçka", "clear notes", "delete notes", "effacer les notes"
    ].some(phrase => lowerQuery.includes(phrase));

    if (isClearRequest) {
        localStorage.removeItem('xsus_ai_notes');
        return lowerQuery.includes("fr") ? "🗑️ _Toutes les notes ont été effacées._" :
               lowerQuery.includes("sq") ? "🗑️ _Të gjitha shënimet u fshinë me sukses._" :
               "🗑️ _All notes have been cleared._";
    }

    return null;
}

function saveNoteToStorage(content) {
    let notes = [];
    try {
        const existing = localStorage.getItem('xsus_ai_notes');
        if (existing) {
            notes = JSON.parse(existing);
        }
    } catch (e) {
        notes = [];
    }
    
    notes.push({
        text: content,
        date: new Date().toLocaleString()
    });

    localStorage.setItem('xsus_ai_notes', JSON.stringify(notes));
}

function getStoredNotes(query) {
    let notes = [];
    try {
        const existing = localStorage.getItem('xsus_ai_notes');
        if (existing) {
            notes = JSON.parse(existing);
        }
    } catch (e) {
        notes = [];
    }

    const isFr = query.includes("afficher") || query.includes("mes");
    const isSq = query.includes("shfaq") || query.includes("shënimet");

    if (notes.length === 0) {
        return isSq ? "📝 _Nuk keni asnjë shënim të ruajtur. Përdorni p.sh: 'Ruaj shënimin: [teksti]'._" :
               isFr ? "📝 _Vous n'avez aucune note enregistrée._" :
                      "📝 _You have no saved notes. Use e.g., 'Save note: [text]'._";
    }

    let output = isSq ? "📝 **Shënimet tuaja të ruajtura:**\n\n" :
                 isFr ? "📝 **Vos notes enregistrées:**\n\n" :
                        "📝 **Your saved notes:**\n\n";

    notes.forEach((note, index) => {
        output += `${index + 1}. ${note.text} _(${note.date})_\n`;
    });

    output += isSq ? "\n_Mund të shkruani 'Fshi shënimet' për t'i pastruar._" :
              isFr ? "\n_Vous pouvez écrire 'Effacer les notes' pour les supprimer._" :
                     "\n_You can type 'Clear notes' to reset._";

    return output;
}
