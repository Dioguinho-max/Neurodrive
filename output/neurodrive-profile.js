(() => {
  'use strict';
  window.createNeuroPilot = ({ request, updated, preview }) => {
    const get = id => document.getElementById(id);
    const tracks = { serra: 'Serra Verde', veloz: 'Autódromo Veloz', tecnico: 'Vale Técnico' };
    const lap = value => Number.isFinite(value) && value > 0 ? `${Math.floor(value / 60)}:${(value % 60).toFixed(3).padStart(6, '0')}` : 'Sem volta registrada';
    let player, editingIdentity, photo, busy = false, generation = 0;
    const say = text => { get('pilot-status').textContent = text; };
    const resetPhoto = () => { photo?.close?.(); photo = null; get('pilot-crop').hidden = true; get('pilot-file').value = ''; };
    const lock = value => {
      busy = value; get('pilot-fields').disabled = value;
      for (const id of ['pilot-file','pilot-upload','pilot-remove-photo','pilot-cancel-photo','pilot-search-button']) get(id).disabled = value;
    };
    async function save(route, data) {
      if (busy || !player) return;
      const current = generation; lock(true); say('Salvando seu piloto…');
      try { const result = await request(route, data); if (current !== generation) return; updated(result.player); resetPhoto(); say('Perfil atualizado!'); }
      catch (error) { if (current === generation) say(error.message || 'Não foi possível salvar. Tente novamente.'); }
      finally { lock(false); }
    }
    function draw() {
      if (!photo) return;
      const canvas = get('pilot-canvas'), context = canvas.getContext('2d');
      const size = Math.min(photo.width, photo.height) / Number(get('pilot-zoom').value);
      const x = (photo.width-size) * Number(get('pilot-x').value)/100, y = (photo.height-size) * Number(get('pilot-y').value)/100;
      context.fillStyle = '#14232e'; context.fillRect(0,0,256,256); context.drawImage(photo,x,y,size,size,0,0,256,256);
    }
    get('pilot-form').onsubmit = event => { event.preventDefault(); save('profile', { nickname: get('pilot-nickname').value.trim(), number: Number(get('pilot-number').value) }); };
    get('pilot-file').onchange = async () => {
      const file = get('pilot-file').files[0]; if (!file) return;
      const current = ++generation; resetPhoto();
      if (file.size > 5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) { say('Escolha uma foto JPG, PNG ou WebP de até 5 MB.'); return; }
      try {
        const image = await createImageBitmap(file);
        if (current !== generation) { image.close(); return; }
        photo = image; get('pilot-zoom').value='1'; get('pilot-x').value=get('pilot-y').value='50';
        get('pilot-crop').hidden=false; draw(); say('Ajuste o enquadramento e confirme em “Usar esta foto”.');
      } catch { say('Não foi possível abrir essa imagem. Escolha outra foto.'); }
    };
    for (const id of ['pilot-zoom','pilot-x','pilot-y']) get(id).oninput=draw;
    get('pilot-upload').onclick = () => { if (photo) save('avatar', { avatar: get('pilot-canvas').toDataURL('image/jpeg', .85) }); };
    get('pilot-cancel-photo').onclick = () => { generation++; resetPhoto(); say('Alteração de foto cancelada.'); };
    get('pilot-remove-photo').onclick = () => save('avatar', { avatar: null });
    get('pilot-search-form').onsubmit = async event => {
      event.preventDefault(); if (busy) return;
      const current = generation; lock(true); get('pilot-visitor').hidden=true;
      try {
        const { pilot } = await request('pilot?name='+encodeURIComponent(get('pilot-search-name').value.trim()));
        if (current !== generation) return;
        const box=get('pilot-visitor'); box.replaceChildren();
        if (pilot.avatar) { const img=document.createElement('img'); img.src=pilot.avatar; img.alt='Foto de '+pilot.nickname; box.append(img); }
        const title=document.createElement('h4'); title.textContent=`#${String(pilot.number).padStart(2,'0')} · ${pilot.nickname}`;
        const info=document.createElement('p'); info.textContent=`@${pilot.username} · ${pilot.stats.races} corridas · ${pilot.stats.wins} vitórias · ${pilot.stats.podiums ?? 0} pódios · ${pilot.stats.poles ?? '—'} poles`;
        box.append(title,info);
        const car = preview(pilot.equipped); if (car) box.append(car);
        for (const [id,name] of Object.entries(tracks)) { const row=document.createElement('p'); row.textContent=`${name}: ${lap(pilot.bestLaps.find(item=>item.track===id)?.time)}`; box.append(row); }
        box.hidden=false; say('Perfil carregado.');
      } catch (error) { say(error.message); } finally { lock(false); }
    };
    return { render(next, skins) {
      player=next;
      if (editingIdentity !== next?.username) { generation++; resetPhoto(); get('pilot-visitor').hidden=true; say(''); }
      editingIdentity=next?.username;
      if (!next) return;
      get('pilot-title').textContent=next.nickname || next.username;
      get('pilot-handle').textContent='@'+next.username;
      get('pilot-badge').textContent='#'+String(next.number ?? 0).padStart(2,'0');
      get('pilot-photo').hidden=!next.avatar; get('pilot-initials').hidden=Boolean(next.avatar);
      if (next.avatar) get('pilot-photo').src=next.avatar;
      else get('pilot-photo').removeAttribute('src');
      get('pilot-initials').textContent=(next.nickname || next.username).slice(0,2).toUpperCase();
      if (!busy) { get('pilot-nickname').value=next.nickname || next.username; get('pilot-number').value=next.number ?? 0; }
      for (const key of ['races','wins','podiums','poles']) get('pilot-'+key).textContent=next.stats?.[key] ?? '—';
      const skin=skins.find(item=>item.id===next.equipped); get('pilot-car-name').textContent='Pintura equipada · '+(skin?.name || 'Original');
      const car=preview(next.equipped); get('pilot-car').replaceChildren(); if (car) get('pilot-car').append(car);
      get('pilot-laps').replaceChildren();
      for (const [id,name] of Object.entries(tracks)) { const row=document.createElement('li'), time=document.createElement('strong'), label=document.createElement('span'); label.textContent=name; time.textContent=lap(next.bestLaps?.find(item=>item.track===id)?.time); row.append(label,time); get('pilot-laps').append(row); }
    } };
  };
})();
