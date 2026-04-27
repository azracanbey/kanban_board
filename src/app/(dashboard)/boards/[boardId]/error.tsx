"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/providers";

type BoardDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function BoardDetailError({ error, reset }: BoardDetailErrorProps) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="surface-panel border border-red-200/60 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
      <p className="text-sm text-red-700 dark:text-red-400">{t("error.boardDetail")}</p>
      <div className="mt-3">
        <Button type="button" variant="secondary" onClick={reset}>
          {t("error.retry")}
        </Button>
      </div>
    </section>
  );
}
