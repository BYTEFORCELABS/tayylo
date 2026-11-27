-- Tell clients when their order moves to a new stage.
ALTER TABLE "Business" ADD COLUMN "notifyClients" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Order" ADD COLUMN "clientNotifiedStatus" TEXT;
