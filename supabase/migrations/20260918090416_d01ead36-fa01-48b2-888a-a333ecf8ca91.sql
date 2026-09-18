select cron.alter_job(7, command := 'select public.extend_weekly_departures(28);');

select * from public.extend_weekly_departures(28);