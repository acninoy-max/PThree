-- Feedback aus der App (Profil → Feedback), neuestes zuerst.

select f.created_at, p.full_name, f.role, f.locale, f.message, f.user_agent
  from app_feedback f
  left join profiles p on p.id = f.user_id
 order by f.created_at desc;
