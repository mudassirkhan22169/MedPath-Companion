import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import notesRouter from "./notes";
import diseasesRouter from "./diseases";
import drugsRouter from "./drugs";
import investigationsRouter from "./investigations";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import osceRouter from "./osce";
import bookmarksRouter from "./bookmarks";
import searchHistoryRouter from "./search-history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(notesRouter);
router.use(diseasesRouter);
router.use(drugsRouter);
router.use(investigationsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(osceRouter);
router.use(bookmarksRouter);
router.use(searchHistoryRouter);

export default router;
