/* A small 3D model of one home and its "guard post":
   noise sensors (Listen), Ring cameras (Look), the booking (Know), and the call (Decide).
   Needs three.js r128 loaded first. Falls back to text if WebGL is missing. */
(function () {
  var stage = document.getElementById('house3d');
  if (!stage) return;
  var caption = document.getElementById('layer-caption');
  var card = document.getElementById('house-card');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.layer-tabs button'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CAPTIONS = {
    listen: '<b>Listen.</b> NoiseAware sensors sit inside and outside. They flag noise over the limit, but they cannot tell a party from wind, traffic or a broken sensor.',
    look: '<b>Look.</b> Ring cameras let an agent hear and see the outside of the home, and next door. This is the step that needs a person.',
    know: '<b>Know.</b> The booking says who is there, how many, and how risky the stay is. Today an agent looks this up by hand for every alert.',
    decide: '<b>Decide.</b> Give leeway, send a reminder, or escalate to security. The bot gathers everything above so the agent only makes this call.'
  };
  var CARDS = {
    listen: '<b>Outdoor sensor</b>Over the limit for 20 min<br>Level 88, during quiet hours',
    look: '<b>Ring: back patio</b>Music and voices audible<br>Next door camera: quiet',
    know: '<b>Booking</b>Fri to Sun, 12 guests<br>Home risk: High. Guest risk: Low',
    decide: '<b>Agent decision</b>Send reminder 1 by text<br>Recheck in 10 minutes'
  };

  function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }

  var layer = 'listen';
  function setLayer(name) {
    layer = name;
    tabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.layer === name)); });
    if (caption) caption.innerHTML = CAPTIONS[name];
    if (card) { card.innerHTML = CARDS[name]; }
    if (typeof applyLayer === 'function') applyLayer();
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { setLayer(b.dataset.layer); }); });

  if (!window.THREE || !hasWebGL()) {
    var fb = stage.querySelector('.fallback');
    if (fb) fb.hidden = false;
    setLayer('listen');
    return;
  }

  var T = window.THREE;
  var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.insertBefore(renderer.domElement, stage.firstChild);

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(36, 1, 0.1, 200);
  var rig = new T.Group();
  scene.add(rig);

  // Light
  scene.add(new T.HemisphereLight(0xdde8f2, 0x0b2440, 0.85));
  var sun = new T.DirectionalLight(0xffffff, 0.75);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  scene.add(sun);

  function mat(color, extra) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.85, metalness: 0 }, extra || {})); }
  function box(w, h, d, m, x, y, z) {
    var mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    rig.add(mesh); return mesh;
  }
  function roof(w, d, h, m, x, y, z) {
    var shape = new T.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.lineTo(-w / 2, 0);
    var g = new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    var mesh = new T.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true;
    rig.add(mesh); return mesh;
  }
  function tree(x, z, s) {
    var trunk = box(0.12 * s, 0.5 * s, 0.12 * s, mat(0x6b5a45), x, 0.25 * s, z);
    var top = new T.Mesh(new T.ConeGeometry(0.45 * s, 1.2 * s, 7), mat(0x5f7f6a));
    top.position.set(x, 0.5 * s + 0.6 * s, z); top.castShadow = true; rig.add(top);
    return [trunk, top];
  }

  // Ground: the street and three lots
  var ground = new T.Mesh(new T.BoxGeometry(22, 0.2, 14), mat(0x2c4a63));
  ground.position.y = -0.1; ground.receiveShadow = true; rig.add(ground);
  var lot = box(8.4, 0.04, 8, mat(0x9fb5a3), 0, 0.02, -0.4);
  box(22, 0.03, 1.6, mat(0x4d6175), 0, 0.02, 4.6); // street

  // Main home
  var wall = mat(0xf4f1ea), trim = mat(0xd9e1e8), roofM = mat(0x3a4f63);
  var house = box(4.2, 1.7, 3, wall, -0.6, 0.85, -1.2);
  roof(4.6, 3.3, 1.2, roofM, -0.6, 1.7, -1.2);
  var garage = box(1.8, 1.2, 2.2, wall, 2.4, 0.6, -0.8);
  roof(2.0, 2.4, 0.6, roofM, 2.4, 1.2, -0.8);
  box(1.4, 0.9, 0.05, trim, 2.4, 0.45, 0.32); // garage door
  box(0.55, 1.0, 0.05, mat(0x022b54), -0.6, 0.5, 0.31); // front door (AvantStay navy)
  [-1.9, 0.7].forEach(function (x) { box(0.8, 0.55, 0.05, mat(0xbfd8e6, { roughness: 0.2 }), x, 1.0, 0.31); });
  box(1.6, 0.05, 1.3, trim, -0.6, 0.03, 0.95); // front path
  box(1.4, 0.04, 2.4, mat(0x7f8c99), 2.4, 0.03, 1.4); // driveway

  // Backyard: patio and pool
  box(4.6, 0.05, 1.6, mat(0xcfc6b5), -0.6, 0.03, -3.6);
  var pool = box(2.6, 0.06, 1.4, mat(0x53c3d0, { roughness: 0.15 }), -0.9, 0.05, -3.55);

  // Fence
  var fenceM = mat(0xb9a88f);
  box(8.2, 0.45, 0.06, fenceM, 0, 0.22, -4.35);
  box(0.06, 0.45, 4.5, fenceM, -4.1, 0.22, -2.1);
  box(0.06, 0.45, 4.5, fenceM, 4.1, 0.22, -2.1);

  // Neighbors (muted)
  var nWall = mat(0x8ea3b6), nRoof = mat(0x5a6f84);
  box(3, 1.4, 2.6, nWall, -7.6, 0.7, -1.2); roof(3.3, 2.9, 0.9, nRoof, -7.6, 1.4, -1.2);
  box(3, 1.4, 2.6, nWall, 7.6, 0.7, -1.2); roof(3.3, 2.9, 0.9, nRoof, 7.6, 1.4, -1.2);
  tree(-3.4, 1.8, 1.1); tree(3.6, -3.6, 1.3); tree(-5.2, -3.2, 1.0); tree(5.4, 2.0, 0.9); tree(-9.5, 2.2, 1.2); tree(9.6, -3.4, 1.1);

  // Sensors (Listen)
  var sensorM = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xA34E34, emissiveIntensity: 0.0, roughness: 0.4 });
  function sensor(x, y, z) {
    var s = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.08, 20), sensorM);
    s.position.set(x, y, z); rig.add(s); return s;
  }
  var outdoorSensor = sensor(0.9, 0.5, -2.75); outdoorSensor.rotation.x = Math.PI / 2;
  var indoorSensor = sensor(-1.9, 1.95, -1.2); // shown on the roof line as "inside"
  var indoorPin = box(0.03, 0.3, 0.03, mat(0xffffff), -1.9, 1.8, -1.2);

  // Sound rings
  var rings = [];
  for (var i = 0; i < 3; i++) {
    var r = new T.Mesh(new T.RingGeometry(0.3, 0.36, 40), new T.MeshBasicMaterial({ color: 0xE07A5F, transparent: true, opacity: 0.7, side: T.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(-0.9, 0.12, -3.55); r.userData.phase = i / 3;
    rig.add(r); rings.push(r);
  }

  // Ring cameras (Look) with view cones
  var camM = new T.MeshStandardMaterial({ color: 0x111111, emissive: 0x53C3D0, emissiveIntensity: 0.0 });
  var coneM = new T.MeshBasicMaterial({ color: 0x53C3D0, transparent: true, opacity: 0.0, depthWrite: false });
  function ringCam(x, y, z, yaw, len) {
    var c = new T.Mesh(new T.BoxGeometry(0.16, 0.24, 0.1), camM);
    c.position.set(x, y, z); rig.add(c);
    var cg = new T.ConeGeometry(len * 0.55, len, 24, 1, true);
    cg.translate(0, -len / 2, 0); cg.rotateX(Math.PI / 2);
    var cone = new T.Mesh(cg, coneM);
    cone.position.set(x, y, z); cone.rotation.y = yaw; cone.rotation.x = 0.35;
    rig.add(cone);
    return cone;
  }
  ringCam(0.0, 1.1, 0.34, Math.PI, 2.6);       // front door, looking at street
  ringCam(-2.7, 1.3, -2.72, 0, 2.4);          // back patio, looking at pool
  var neighborCone = ringCam(7.6, 1.0, 0.12, Math.PI, 2.0); // next door

  // Booking halo (Know)
  var halo = new T.Mesh(new T.TorusGeometry(2.9, 0.04, 8, 80), new T.MeshBasicMaterial({ color: 0x53C3D0, transparent: true, opacity: 0 }));
  halo.rotation.x = Math.PI / 2; halo.position.set(-0.1, 0.1, -1.3); rig.add(halo);

  // Phone ping (Decide)
  var ping = new T.Mesh(new T.SphereGeometry(0.22, 20, 16), new T.MeshStandardMaterial({ color: 0x53C3D0, emissive: 0x53C3D0, emissiveIntensity: 0.6, transparent: true, opacity: 0 }));
  ping.position.set(-0.6, 3.4, -1.2); rig.add(ping);

  var anchor = new T.Vector3();
  function anchorFor() {
    if (layer === 'listen') return outdoorSensor.position;
    if (layer === 'look') return new T.Vector3(-2.7, 1.5, -2.72);
    if (layer === 'know') return new T.Vector3(-0.6, 2.95, -1.2);
    return ping.position;
  }

  var applyLayer = function () {
    var L = layer;
    sensorM.emissiveIntensity = L === 'listen' ? 0.9 : 0.15;
    rings.forEach(function (r) { r.visible = L === 'listen' || L === 'decide'; });
    camM.emissiveIntensity = L === 'look' ? 1.0 : 0.1;
    coneM.opacity = L === 'look' ? 0.22 : 0.0;
    halo.material.opacity = L === 'know' ? 0.9 : 0.0;
    ping.material.opacity = L === 'decide' ? 0.95 : 0.0;
    if (card) card.classList.add('show');
  };
  window.applyLayer = applyLayer;
  setLayer('listen');

  // Interaction: drag to turn
  var yaw = -0.5, targetYaw = -0.5, dragging = false, lastX = 0, autoSpin = !reduce;
  var canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; autoSpin = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function (e) { if (!dragging) return; targetYaw += (e.clientX - lastX) * 0.008; lastX = e.clientX; });
  canvas.addEventListener('pointerup', function () { dragging = false; });
  canvas.addEventListener('pointercancel', function () { dragging = false; });

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var far = w < 480 ? 21 : 17.5;
    camera.position.set(0, far * 0.55, far * 0.82);
    camera.lookAt(0, 0.4, -0.8);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
  }

  var t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    var t = (now - t0) / 1000;
    if (autoSpin) targetYaw += 0.0016;
    yaw += (targetYaw - yaw) * 0.12;
    rig.rotation.y = yaw;

    rings.forEach(function (r) {
      var p = reduce ? r.userData.phase : (t * 0.45 + r.userData.phase) % 1;
      var s = 1 + p * 5;
      r.scale.set(s, s, s);
      r.material.opacity = 0.75 * (1 - p);
    });
    if (layer === 'decide' && !reduce) { ping.position.y = 3.4 + Math.sin(t * 3) * 0.12; }

    renderer.render(scene, camera);

    if (card) {
      anchor.copy(anchorFor()).applyMatrix4(rig.matrixWorld).project(camera);
      card.style.left = ((anchor.x + 1) / 2 * stage.clientWidth) + 'px';
      card.style.top = ((1 - anchor.y) / 2 * stage.clientHeight) + 'px';
    }
  }
  requestAnimationFrame(frame);
})();
