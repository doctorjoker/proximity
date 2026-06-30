import asyncio

from app.modules.service_workflows.scheduler import (
    schedule_next_workflow,
)


async def worker_loop():

    print("Workflow Worker started")

    while True:
        try:
            await schedule_next_workflow()
        except Exception as exc:
            print(
                f"Worker error: {exc}"
            )

        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(
        worker_loop()
    )
