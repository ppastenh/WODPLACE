import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import contractsRouter from "./contracts";
import healthRouter from "./health";
import storageRouter from "./storage";
import usersRouter from "./users";
import bookingsRouter from "./bookings";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(bookingsRouter);
router.use(notificationsRouter);
router.use(contractsRouter);
router.use(adminRouter);

export default router;
