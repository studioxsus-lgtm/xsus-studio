// Export-only deployment targets. No credentials, API calls, or remote writes.
export const DEPLOYMENT_TARGETS = Object.freeze({
  'static-host':Object.freeze({label:'Generic static host',directory:'/',instructions:['Upload index.html, styles.css and app.js to the same public directory','Enable HTTPS and verify the deployed page']}),
  'github-pages':Object.freeze({label:'GitHub Pages',directory:'/',instructions:['Create or choose a dedicated publishing repository or branch','Upload the three application files to its publishing directory','Enable Pages in repository settings and verify the published URL']}),
  'render-static':Object.freeze({label:'Render Static Site',directory:'/',instructions:['Create a Static Site in Render using a repository containing the three files','Set the publish directory to the directory holding index.html','Verify HTTPS, assets and runtime behavior after deployment']})
});
export function getDeploymentTarget(id) {
  if (!Object.hasOwn(DEPLOYMENT_TARGETS,id)) throw new TypeError('Unsupported deployment target');
  return DEPLOYMENT_TARGETS[id];
}
