// Lo único que el panel puede pedirle al programa: su versión y buscar actualizaciones.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('escritorio', {
  version: () => ipcRenderer.invoke('escritorio:version'),
  buscarActualizacion: () => ipcRenderer.invoke('escritorio:buscar'),           // solo el panel (v1.0.0)
  buscarSistema: () => ipcRenderer.invoke('escritorio:buscarSistema'),          // panel + programa
  alCambiarEstado: fn => ipcRenderer.on('escritorio:estado', (_e, estado) => fn(estado)),
});
