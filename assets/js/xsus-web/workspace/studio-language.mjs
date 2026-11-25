const labels = {
  'Projects':['Projektet','Projets'], 'Intelligence':['Inteligjenca','Intelligence'],
  'Workspace':['Hapësira e punës','Espace de travail'], 'Save':['Ruaj','Enregistrer'],
  'Preview':['Parapamje','Aperçu'], 'desktop':['Kompjuter','Ordinateur'],
  'mobile':['Telefon','Téléphone'], 'tablet':['Tablet','Tablette'],
  'Generate':['Gjenero','Générer'], 'Refresh projects':['Rifresko projektet','Actualiser les projets'],
  'Open project':['Hap projektin','Ouvrir le projet'], 'Propose replacement':['Propozo ndryshime','Proposer des modifications'],
  'Accept proposal':['Mirato ndryshimet','Accepter les modifications'], 'Reject proposal':['Refuzo ndryshimet','Rejeter les modifications'],
  'Download current ZIP':['Shkarko ZIP-in aktual','Télécharger le ZIP actuel'],
  'Project name (required)':['Emri i projektit (i detyrueshëm)','Nom du projet (obligatoire)'],
  'Describe your website':['Përshkruaj website-in ose ndryshimin','Décrivez le site ou la modification'],
  'Project name':['Emri i projektit','Nom du projet'],'Website instructions':['Udhëzimet','Instructions'],
  'Language':['Gjuha','Langue'],'Existing project':['Projekti ekzistues','Projet existant'],
  'Source file':['Skedari','Fichier source'],'Preview device':['Pajisja','Appareil'],'Source code':['Kodi burimor','Code source'],
  'Studio panels':['Panelet e studios','Panneaux du studio'],'Working…':['Në përpunim…','Traitement en cours…'],
  'Ready':['Gati','Prêt'],'Unsaved changes':['Ndryshime të paruajtura','Modifications non enregistrées'],
  'Saving…':['Po ruhet…','Enregistrement…'],'Offline':['Pa internet','Hors connexion'],
  'Saved · Version':['U ruajt · Versioni','Enregistré · Version'],
  'Revision conflict · Your changes are still open':['Konflikt versionesh · Ndryshimet e tua janë ende të hapura','Conflit de versions · Vos modifications restent ouvertes'],
  'Save changes before switching files':['Ruaj ndryshimet para ndërrimit të skedarit','Enregistrez avant de changer de fichier'],
  'Save failed':['Ruajtja dështoi','Échec de l’enregistrement'],
  'Check the connection and retry':['Kontrollo lidhjen dhe riprovo','Vérifiez la connexion et réessayez'],
  'Storage quota exceeded':['Hapësira e ruajtjes është mbushur','Espace de stockage épuisé'],
  'Project too large':['Projekti është shumë i madh','Projet trop volumineux'],
  'Sign in again':['Hyr përsëri','Reconnectez-vous'],
  'Preview unavailable':['Parapamja nuk është e disponueshme','Aperçu indisponible'],
  'Invalid project details.':['Kontrollo emrin dhe udhëzimet e projektit.','Vérifiez le nom et les instructions du projet.'],
  'Please sign in again.':['Hyr përsëri në llogari.','Veuillez vous reconnecter.'],
  'Website origin not authorized.':['Origjina e website-it nuk është autorizuar.','Origine du site non autorisée.'],
  'Project revision conflict.':['Konflikt versionesh.','Conflit de versions.'],
  'Service busy. Try again.':['Shërbimi është i zënë. Riprovo.','Service occupé. Réessayez.'],
  'Build service unavailable.':['Shërbimi i ndërtimit nuk është i disponueshëm.','Service de construction indisponible.'],
  'Operation failed. Check project details and connection.':['Veprimi dështoi. Kontrollo projektin dhe lidhjen.','Échec. Vérifiez le projet et la connexion.'],
  'Sign in to generate and save websites.':['Hyr në llogari për të gjeneruar dhe ruajtur website.','Connectez-vous pour générer et enregistrer vos sites.']
};
export function studioText(document,key){
  const language=document.documentElement.lang;
  return (language==='sq'?labels[key]?.[0]:language==='fr'?labels[key]?.[1]:key)??key;
}
export function localizeStudio(document,root){
  for(const el of root.querySelectorAll('[data-copy]'))el.textContent=studioText(document,el.dataset.copy);
  for(const el of root.querySelectorAll('[data-hint]'))el.placeholder=studioText(document,el.dataset.hint);
  for(const el of root.querySelectorAll('[data-label-key]'))el.setAttribute('aria-label',studioText(document,el.dataset.labelKey));
}
