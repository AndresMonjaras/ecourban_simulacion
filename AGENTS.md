# Playwright MCP con Chrome existente

Cuando Playwright Extension ya esté conectada y DeepSeek no aparezca entre las pestañas:

- Reutiliza la conexión actual de Playwright MCP. No reinstales la extensión, no abras un navegador independiente ni cambies la configuración.
- Abre DeepSeek como pestaña nueva dentro de esa conexión con `browser_tabs({ action: "new", url: "https://chat.deepseek.com/" })`.
- Después lista las pestañas con `browser_tabs({ action: "list" })`. Selecciona DeepSeek solo si no es la pestaña actual y aparece en la lista.
- Ejecuta `browser_snapshot` y comprueba si está el campo `Message DeepSeek`.
- Si aparece `sign_in`, informa que la sesión no está autenticada en el perfil conectado. Si carga el chat sin `sign_in`, describe lo visible y no afirmes una identidad de cuenta que la página no muestre.
- Si se solicita verificar DeepThink, comprueba su estado actual; `aria-pressed="false"` significa desactivado.
- No envíes mensajes salvo que el usuario lo pida explícitamente.
- Si una llamada queda esperando autorización de conexión, espera al usuario y no repitas la llamada bloqueada.
