/* ==========================================================================
   Booking configuration
   Fill these in after creating your Supabase project (see SETUP.md, step 1).
   Both values are SAFE to publish: the database's security rules decide
   what visitors can do, and the Resend key is NOT stored here.

   Never put your Resend API key or Supabase "service_role"/"secret" key
   in this file or anywhere else in the website.
   ========================================================================== */
window.BOOKING_CONFIG = {
    // Supabase -> Project Settings -> Data API -> Project URL
    supabaseUrl: 'https://YOUR-PROJECT-ID.supabase.co',

    // Supabase -> Project Settings -> API Keys -> "anon public" key
    // (or the "publishable" key, which starts with sb_publishable_)
    supabaseKey: 'YOUR-SUPABASE-ANON-OR-PUBLISHABLE-KEY',

    // Name of the Edge Function you deploy in SETUP.md, step 4.
    functionName: 'booking-api',

    // All times are shown in this time zone.
    timezone: 'Asia/Kathmandu'
};
