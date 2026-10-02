// Lo único que el panel puede pedirle al programa: su versión y buscar actualizaciones.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('escritorio', {
  version: () => ipcRenderer.invoke('escritorio:version'),
  buscarActualizacion: () => ipcRenderer.invoke('escritorio:buscar'),
});
