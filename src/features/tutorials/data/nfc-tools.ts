import type { Tutorial } from '@/types';

// Placeholder content for the NFC Tools Tutorial (Spec Section 8D.3)
// Assumes images are placed in /public/media/tutorials/
export const nfcToolsTutorial: Tutorial = {
    id: 'nfc-tools',
    name: 'NFC Tools Setup Guide',
    estimatedMinutes: 3,
    steps: [
        {
            id: 'nfc-1',
            order: 1,
            title: 'Install NFC Tools',
            markdown: 'Download **NFC Tools** from the Google Play Store (or App Store for limited read-only use on iOS) and open it.',
            // mediaId: 'nfc-install-img' // Link to a MediaAsset ID if using store
            // Or use direct image path:
            // markdown: 'Download **NFC Tools** from Google Play and open it. ![NFC Tools Install](/media/tutorials/nfc-install.png)'
        },
        {
            id: 'nfc-2',
            order: 2,
            title: 'Go to Write Tab',
            markdown: 'Tap the **Write** tab located at the bottom of the screen.' 
            // markdown: 'Tap the **Write** tab at bottom. ![NFC Tools Write Tab](/media/tutorials/nfc-write-tab.png)'
        },
        {
            id: 'nfc-3',
            order: 3,
            title: 'Add URL Record',
            markdown: 'Tap **Add a record**, then select **URL/URI** from the list.' 
            // markdown: 'Tap **Add a record** ➜ **URL/URI**. ![NFC Tools Add Record](/media/tutorials/nfc-add-record.png)'
        },
        {
            id: 'nfc-4',
            order: 4,
            title: 'Enter PlankYou URI',
            markdown: 'Enter the specific URI for your workout tag (e.g., `plankyou://workout/CORE01`) and tap **OK**. You can find the correct URI on the workout setup page within PlankYou.' 
            // markdown: 'Enter `plankyou://workout/CORE01` and tap **OK**. ![NFC Tools Enter URI](/media/tutorials/nfc-enter-uri.png)'
        },
        {
            id: 'nfc-5',
            order: 5,
            title: 'Write to Tag',
            markdown: 'Tap the **Write / x records** button. Hold your phone steady near the NFC sticker until you see the confirmation message.' 
            // markdown: 'Tap **Write / 1 record** and hold phone on sticker. ![NFC Tools Write Button](/media/tutorials/nfc-write.png)'
        },
        {
            id: 'nfc-6',
            order: 6,
            title: 'Confirmation',
            markdown: 'Wait for the **Write completed!** message. You can now use this tag with PlankYou. Repeat for other tags/locations.' 
            // markdown: 'Wait for **Write completed!** message. Repeat for other tags. ![NFC Tools Success](/media/tutorials/nfc-success.png)'
        }
    ]
};

// Example of how markdown images would work if added:
// ![Alt text describing the image](/media/tutorials/nfc-install.png) 