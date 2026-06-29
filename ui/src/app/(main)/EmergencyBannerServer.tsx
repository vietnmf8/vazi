import { getFooterSettings } from "@/lib/api/footer.api";
import { EmergencyNoticeBanner } from "@/components/sections";

export default async function EmergencyBannerServer() {
    const contact = await getFooterSettings();

    return (
        <EmergencyNoticeBanner
            whatsappUrl={contact.whatsappUrl}
            email={contact.email}
        />
    );
}
