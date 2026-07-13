import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import contractsRouter from "./contracts";
import healthRouter from "./health";
import storageRouter from "./storage";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(contractsRouter);
router.use(adminRouter);

export default router;
