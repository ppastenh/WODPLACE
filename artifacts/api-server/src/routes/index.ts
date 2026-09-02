import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import boxesRouter from "./boxes";
import contractsRouter from "./contracts";
import healthRouter from "./health";
import storageRouter from "./storage";
import usersRouter from "./users";
import bookingsRouter from "./bookings";
import notificationsRouter from "./notifications";
import rmRouter from "./rm";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(boxesRouter);
router.use(bookingsRouter);
router.use(notificationsRouter);
router.use(contractsRouter);
router.use(socialRouter);
router.use(rmRouter);
router.use(adminRouter);

export default router;
