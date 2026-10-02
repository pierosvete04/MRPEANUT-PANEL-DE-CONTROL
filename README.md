# Mr. Peanut · Panel de control

Panel para registrar pedidos (B2C y B2B), clientes, el Club Mr. Peanut e inventario por lotes.
Todo se guarda primero en la computadora y se respalda solo en Supabase. El detalle de cómo funciona está en [LEEME.md](LEEME.md).

## Instalar el programa (Windows)

1. Entra a [Releases](https://github.com/pierosvete04/MRPEANUT-PANEL-DE-CONTROL/releases/latest) y descarga `MrPeanut-Panel-Setup-x.y.z.exe`.
2. Ábrelo. Windows puede mostrar “Windows protegió su PC” (el instalador no tiene firma digital): **Más información → Ejecutar de todas formas**.
3. Abre **Mr. Peanut Panel** (escritorio o menú Inicio) → **Sincronización** → entra con tu usuario de Supabase. Se bajan todos tus datos.

## Cómo se actualiza

| Qué cambia | Qué hacer | Cómo llega a las PCs |
|---|---|---|
| El panel (`index.html`, `app.js`, `styles.css`, `img/`, `fonts/`) | Subir los cambios a la rama `main` | El programa revisa GitHub al abrir y cada 30 minutos, baja solo lo que cambió y pregunta si recargar |
| El programa (carpeta `escritorio/`) | Subir `version` en `escritorio/package.json` y publicar un Release (abajo) | El programa baja el instalador nuevo y se actualiza al cerrarlo |

## Carpetas

- Raíz: el panel web (HTML/CSS/JS, sin frameworks). También funciona abierto desde un servidor web.
- `escritorio/`: el programa de Windows (Electron). `actualizador.js` baja el panel desde GitHub; `main.js` abre la ventana.
- `supabase/`: tablas, seguridad (RLS) y la función del catálogo de Meta.

## Para desarrollar el programa

```
cd escritorio
npm install
npm start            # abre el programa con el panel de esta carpeta
npm run instalador   # crea el instalador en escritorio/dist
```

Publicar una versión nueva del programa (sube el instalador a Releases; necesita un token de GitHub en `GH_TOKEN`):

```
cd escritorio
npm run publicar
```
