#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path("/opt/proximity/proximity-frontend")
STEP_EXPLORER = ROOT / "src/pages/procedures/components/StepExplorer.jsx"
PROCEDURE_DESIGNER = ROOT / "src/pages/procedures/ProcedureDesigner.jsx"
PACKAGE_DIR = Path(__file__).resolve().parent
NEW_STEP_EXPLORER = PACKAGE_DIR / "StepExplorer.jsx"

def fail(message):
    print(f"ERRORE: {message}", file=sys.stderr)
    raise SystemExit(1)

for path in (STEP_EXPLORER, PROCEDURE_DESIGNER, NEW_STEP_EXPLORER):
    if not path.exists():
        fail(f"File non trovato: {path}")

timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
for path in (STEP_EXPLORER, PROCEDURE_DESIGNER):
    backup = path.with_name(f"{path.name}.bak-eureka12-3-1c-{timestamp}")
    shutil.copy2(path, backup)
    print(f"Backup creato: {backup}")

shutil.copy2(NEW_STEP_EXPLORER, STEP_EXPLORER)
print(f"Aggiornato: {STEP_EXPLORER}")

source = PROCEDURE_DESIGNER.read_text(encoding="utf-8")

old_payload = """        body: JSON.stringify({
          name: step.label,
          description: step.description || null,
          phase_type: phaseTypeForStep(step),
          handler: step.id,
          position: targetPosition,
        }),"""

new_payload = """        body: JSON.stringify({
          name: step.label,
          description: step.description || null,

          // Meta-modello EUREKA 12.3.1c.
          // phase_type resta presente per compatibilita con l'endpoint
          // authoring gia operativo.
          phase_type: step.phaseType || phaseTypeForStep(step),
          type: step.phaseType || phaseTypeForStep(step),
          category: step.runtimeCategory || 'CUSTOM',
          action: step.action || step.id,
          handler: step.action || step.id,

          position: targetPosition,
        }),"""

if old_payload not in source:
    fail(
        "Blocco payload addNode non riconosciuto. "
        "Nessuna modifica applicata a ProcedureDesigner.jsx."
    )

source = source.replace(old_payload, new_payload, 1)

old_phase = """        phase: {
          ...createdNode.phase,
          category: step.category,
          handler: step.id,
        },"""

new_phase = """        phase: {
          ...createdNode.phase,
          type: step.phaseType || createdNode.phase?.type || 'ACTION',
          category: step.runtimeCategory || createdNode.phase?.category || 'CUSTOM',
          action: step.action || createdNode.phase?.action || step.id,
          handler: step.action || createdNode.phase?.handler || step.id,
          explorerCategory: step.category,
        },"""

if old_phase not in source:
    fail(
        "Blocco phase del nodo creato non riconosciuto. "
        "Ripristina i backup appena creati prima di procedere."
    )

source = source.replace(old_phase, new_phase, 1)
PROCEDURE_DESIGNER.write_text(source, encoding="utf-8")
print(f"Aggiornato: {PROCEDURE_DESIGNER}")
print("Patch EUREKA 12.3.1c applicata correttamente.")
print("Ora eseguire: cd /opt/proximity/proximity-frontend && npm run build")
