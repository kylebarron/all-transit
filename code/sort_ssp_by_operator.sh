function sort_ssp_by_operator() {
    operator_id=$1
    i=$2
    gunzip -c data/ssp/ssp${i}.json.gz \
        | jq -c --arg operator_id $operator_id \
        'if .operator_onestop_id == $operator_id then . else empty end' \
        | gzip \
        > data/ssp_by_operator_id_${i}/$operator_id.json.gz
}

sort_ssp_by_operator "$1" "$2"
