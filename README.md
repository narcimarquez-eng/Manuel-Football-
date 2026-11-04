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

## Modelos

- `santiago_bernabeu.glb`: el estadio. La página lo escala sola (el césped a su tamaño real),
  encuentra la boca del túnel de vestuarios y construye el pasillo detrás.
- `nino.glb`: **Manuel**, ya preparado con `Nino.py` del repositorio *mi-perro* (brazo bajado, animaciones de
  andar, correr, chutar… y el balón como pieza aparte, que la intro quita). Si no estuviera, la página busca
  `manuel.glb` o `Manuel.glb`, y en la portada se puede pulsar **«cambiar»** junto a «Manuel» para elegir otro
  archivo del dispositivo (se guarda solo en ese dispositivo). Lo mismo vale para el estadio.
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
