fetch('http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: `{
            stops(name: "${ text }") {
                id
                name
            }
        }` 
        }),
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(data => vastaus = data)
    .then(() => console.log(vastaus))