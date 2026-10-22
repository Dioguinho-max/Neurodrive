const assert = require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const api={}, nodes=new Map();
const get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
for(const file of ['neuro-pista-track.js','neurodrive-circuit-preview.js']) new Function('window',fs.readFileSync(path.join(__dirname,'..',file),'utf8'))(api);
get('menu-mode').value='single';
const maps=new Set();
for(const track of api.NeuroTracks){
  get('menu-track').value=track.id;api.updateNeuroCircuitPreview(get);
  assert.equal(get('circuit-preview-name').textContent,track.name);
  assert.equal(get('circuit-preview-length').textContent,`${(api.createNeuroTrack(track.id).length/4000).toFixed(2)} km · Traçado completo`);
  const svg=get('circuit-preview-map').innerHTML;
  assert(!svg.includes('NaN')&&!svg.includes('Infinity'));
  assert(svg.includes('<circle'));maps.add(svg);
}
assert.equal(maps.size,4);
get('menu-mode').value='championship';api.updateNeuroCircuitPreview(get);
assert.equal(get('circuit-preview-name').textContent,'Serra Verde');
console.log('OK: four distinct circuit maps, physics-based lengths and championship first round.');
