import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://twgjayyzmncpyzxnesci.supabase.co";
const supabaseKey = "sb_publishable_ATO4HjCyBXLGFbznyf8v1w_oNFi3YLG";

export const supabase = createClient(supabaseUrl, supabaseKey);