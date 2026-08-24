const taskFields = ['parent_task_id','title','description','notes','status','priority','difficulty','start_date','due_date','completed_at','reminder_at','repeat_type','estimated_minutes','actual_minutes','progress','energy_required','created_by_ai','created_source','ai_reason','metadata'];
const habitFields = ['parent_habit_id','title','description','frequency','goal_value','unit','reminder_time','active','color','icon','created_by_ai','metadata'];
const focusSessionFields = ['task_id','session_name','session_type','planned_minutes','actual_minutes','started_at','ended_at','status','quality','distraction_count','pause_count','resume_count','ai_intervention_count','completed','mood_before','mood_after','energy_before','energy_after','user_rating','notes','metadata'];
const notificationFields = ['title','body','notification_type','scheduled_at','sent_at','read_at','clicked_at','dismissed_at','related_entity_type','related_entity_id','metadata','status'];
const profileFields = ['full_name','username','email','avatar_url','bio','date_of_birth','gender','occupation','country','city','timezone','onboarding_completed'];
const adhdProfileFields = ['adhd_type','diagnosis_status','diagnosed_year','medication','therapy','sleep_goal_hours','preferred_focus_length','preferred_break_length','energy_pattern','biggest_challenges','strengths','goals'];
const preferenceFields = ['theme','language','notifications_enabled','reminder_sound','vibration_enabled','motivational_style','daily_goal_minutes','week_start','ai_personality'];

module.exports = { taskFields, habitFields, focusSessionFields, notificationFields, profileFields, adhdProfileFields, preferenceFields };
