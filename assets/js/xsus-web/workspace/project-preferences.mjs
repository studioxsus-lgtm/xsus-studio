// Only navigation metadata is kept on the device. The API controls project access.
export function projectPreferences(storage, owner) {
  const key = 'xsus.web.projects.v2.' + owner;
  function read() {
    try { return JSON.parse(storage.getItem(key)) || {}; }
    catch { return {}; }
  }
  return {
    read,
    remember(id, details) {
      const previous = read();
      const projects = {...previous.projects, [id]: details};
      try { storage.setItem(key, JSON.stringify({active:id, projects})); }
      catch { /* The workspace can still use server storage. */ }
    }
  };
}
