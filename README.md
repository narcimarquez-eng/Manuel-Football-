# Manuel Football

El juego de fútbol de Manuel. De momento tiene la **intro**: la salida al césped del Santiago Bernabéu,
como en una película.

## La intro (`index.html`)

Dura algo menos de un minuto y va sincronizada con la música (90 pulsos por minuto):

1. **Plano aéreo** de Madrid de noche: el estadio iluminado, focos que barren el cielo y el texto
   «Esta noche, en Madrid… una estrella sale al césped».
2. **El túnel de vestuarios**: las botas de Manuel, su cara, y por detrás hacia la luz del campo.
   El speaker anuncia: «Señoras y señores… bienvenidos al Santiago Bernabéu. Con el número diez… ¡MANUEL!».
3. **La salida**: destello blanco, columnas de fuego, chorros de humo, fuentes de chispas y el estadio
   que ruge.
4. **Saluda** a un fondo y al otro (el rótulo «MANUEL · Nº 10» aparece como en la tele) y levanta los
   brazos mientras la grada canta «¡MA-NUEL!».
5. **Corre** hasta el centro del campo.
6. **En el centro** da una vuelta entera saludando a todo el estadio: la grada hace la ola, hay fuegos
   artificiales sobre el techo, confeti y flashes de móviles.
7. **Grúa final**: la cámara sube hasta ver el estadio entero y aparece el título **MANUEL FOOTBALL**.
   Después la grada sigue cantando.

Detalles:

- **Público**: unos 42.000 aficionados (17.000 en el móvil) colocados sobre las gradas del modelo con
  rayos, que saltan, levantan los brazos y hacen la ola. En los fondos hay dos mosaicos: «MANUEL ★ 10 ★»
  y «¡VAMOS! MANUEL».
- **Música**: banda sonora épica de tráiler hecha en el navegador con Web Audio (cuerdas, metales, coro,
  timbales, taikos, «braams», platillos y campanas), sin archivos ni derechos de autor. También el ruido
  de la grada, el canto «¡MA-NUEL!», las palmas, el fuego y los petardos.
- **Voz** del speaker con la síntesis de voz del navegador (con subtítulos por si no hay voz en español).
- Botones **Saltar**, **silenciar**, **Ver otra vez** y **¡A jugar!** (el partido llegará pronto).

## El partido (`partido.js`)

Al acabar la intro, **¡A jugar el partido!** (o **⚽ Jugar partido** en la portada) abre un partido de
fútbol arcade **11 contra 11** en el **Santiago Bernabéu** o en el **Camp Nou** (se elige en el menú): Manuel FC (Manuel con el 10) contra uno de cuatro rivales
(Tiburones, Volcanes, Halcones o Relámpagos), con duración y dificultad a elegir.

- **Panorámica**: al empezar, la cámara sobrevuela el estadio y baja hasta la banda (se salta con PASE o TIRO).
- **Césped**: textura propia en los dos estadios (manchas, desgaste en las áreas, briznas en relieve, líneas
  reglamentarias) y franjas de corte que se ven más claras u oscuras según el lado desde el que mira la cámara.
- **Jugadores**: todos salen del modelo de Manuel (`jugador.glb`, una versión ligera de `nino.glb` hecha con
  glTF-Transform). A cada uno se le quita la cabeza y se le pone otra de dibujo con su cara, sus ojos, su pelo
  (corto, pinchos, afro, cresta, coleta, rizos, rapado o flequillo) y su color de piel, que también cambia en
  brazos y piernas. Tienen alturas distintas y la equipación de su equipo; los porteros van de otro color.
  Solo Manuel conserva su cara.
- **Controles**: flechas o WASD para correr, **Z** pase (mantener: pase largo), **X** tiro (mantener para
  cargar la potencia), **Mayús** sprint. Sin balón, **Z** cambia de jugador y **X** hace una entrada en plancha.
  **P** pausa. En el móvil hay joystick y botones PASE, TIRO y ⚡; también vale un mando.
- **Supertiro**: la barra se llena teniendo el balón, pasando y robando. Llena, un tiro cargado a tope se
  convierte en un supertiro de fuego con cámara lenta que el portero casi nunca para.
- **El ordenador** juega en 4-4-2: presiona, hace entradas, pasa hacia delante, centra desde la banda y chuta;
  los porteros se colocan, salen y se estiran (paradas, despejes y paradones).
- Hay córners, saques de banda y de puerta, saque de centro, descanso, cabezazos, rebotes en los postes,
  celebraciones con fuegos artificiales y confeti, grada que se anima cerca de las áreas, la ola, cantos
  «¡MA-NUEL!», pitidos del árbitro, narrador y radar del campo.

Para probar: `?partido` abre el partido directamente, `?estadio=campnou` lo abre en el Camp Nou y `?auto=2` juega un partido de 2 minutos en el que el
ordenador lleva a los dos equipos.

## Modelos

- `santiago_bernabeu.glb` y `camp_nou.glb`: los estadios. La página encuentra las porterías y ajusta la escala
  para que la línea de gol quede a 52,5 m del centro (campo de 105 × 68 m).
- `santiago_bernabeu.glb`: el estadio de la intro. La página lo escala sola (el césped a su tamaño real),
  encuentra la boca del túnel de vestuarios y construye el pasillo detrás.
- `nino.glb`: **Manuel**, ya preparado con `Nino.py` del repositorio *mi-perro* (brazo bajado, animaciones de
  andar, correr, chutar… y el balón como pieza aparte, que la intro quita). Si no estuviera, la página busca
  `manuel.glb` o `Manuel.glb`, y en la portada se puede pulsar **«cambiar»** junto a «Manuel» para elegir otro
  archivo del dispositivo (se guarda solo en ese dispositivo). Lo mismo vale para el estadio.
- `jugador.glb`: el modelo de Manuel simplificado (unos 9.000 triángulos en vez de 88.000) para los otros 21
  futbolistas.
- `reserva.glb`: si no hay modelo de Manuel, sale un niño de dibujos inventado (Hugo, uno de los amigos de
  *mi-perro*) con la equipación blanca.

Las animaciones de Manuel (`idle`, `walk`, `run`) se usan tal cual y los saludos se hacen moviendo los
huesos de los brazos, así que vale cualquier esqueleto (el de Mixamo o el de los personajes de *mi-perro*).

## Verla

La página necesita un servidor (los navegadores no cargan modelos desde `file://`):

```sh
python3 -m http.server
```

y abrir http://localhost:8000. Con GitHub Pages activado sobre la rama `main` se abre en
`https://narcimarquez-eng.github.io/Manuel-Football-/`.

Para probar: `?t=30` empieza en el segundo 30 y `?publico=8000` pone menos aficionados.
