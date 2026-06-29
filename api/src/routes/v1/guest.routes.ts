import { Router } from "express";
import { postGuestPing, postGuestDraft } from "@/controllers/guest.controller";

const guestRoutes = Router();

guestRoutes.post("/ping", postGuestPing);
guestRoutes.post("/draft", postGuestDraft);

export default guestRoutes;
