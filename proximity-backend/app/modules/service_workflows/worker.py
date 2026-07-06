import asyncio
import logging

from app.modules.service_workflows.scheduler import (
    schedule_next_workflow,
)

from app.modules.service_workflows.queue_repository import (
    recover_running_workflows,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

logger = logging.getLogger("workflow-worker")


async def worker_loop():
    logger.info("Recovering interrupted workflows...")

    recovered = recover_running_workflows()

    logger.info(
        "Recovered %d interrupted workflows",
        len(recovered),
    )

    logger.info("Workflow Worker started")

    while True:
        try:
            result = await schedule_next_workflow()

            if result is not None:
                logger.info(
                    "Workflow processed: %s",
                    result.get("workflow_code"),
                )

                # Se c'è ancora lavoro in coda,
                # processa subito il prossimo workflow.
                continue

        except Exception:
            logger.exception(
                "Workflow execution failed"
            )

            # Evita loop serrati in caso di errore.
            await asyncio.sleep(2)

        # Nessun workflow disponibile.
        await asyncio.sleep(1)


def main():
    asyncio.run(
        worker_loop()
    )


if __name__ == "__main__":
    main()
