if (!window.connectionsRef) {
  window.connectionsRef = { current: [] };
}

export const connectionsRef = window.connectionsRef;

export function addConnection(conn) {
  if (!conn) return;

  const alreadyExists = connectionsRef.current.some(
    existing => existing === conn || existing.peer === conn.peer
  );

  if (!alreadyExists) {
    connectionsRef.current = [...connectionsRef.current, conn];
  }
}

export function removeConnection(conn) {
  if (!conn) return;

  connectionsRef.current = connectionsRef.current.filter(
    existing => existing !== conn && existing.peer !== conn.peer
  );
}
