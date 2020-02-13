# Add new fields for array fields
. +
{
    service_days_of_week_0: .service_days_of_week[0],
    service_days_of_week_1: .service_days_of_week[1],
    service_days_of_week_2: .service_days_of_week[2],
    service_days_of_week_3: .service_days_of_week[3],
    service_days_of_week_4: .service_days_of_week[4],
    service_days_of_week_5: .service_days_of_week[5],
    service_days_of_week_6: .service_days_of_week[6],
}
# Remove keys with array values
| del(.service_days_of_week)
| del(.service_except_dates)
| del(.service_added_dates)
| [.[]]
| @csv
