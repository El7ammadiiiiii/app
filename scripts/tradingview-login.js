const TradingView = require( "@mathieuc/tradingview" );

if ( !process.env.TRADINGVIEW_USERNAME )
{
    throw new Error( "Missing TRADINGVIEW_USERNAME env var" );
}
if ( !process.env.TRADINGVIEW_PASSWORD )
{
    throw new Error( "Missing TRADINGVIEW_PASSWORD env var" );
}

TradingView.loginUser( process.env.TRADINGVIEW_USERNAME, process.env.TRADINGVIEW_PASSWORD, false )
    .then( ( user ) =>
    {
        console.log( "TRADINGVIEW_SESSION=", user.session );
        console.log( "TRADINGVIEW_SIGNATURE=", user.signature );
    } )
    .catch( ( err ) =>
    {
        console.error( "Login error:", err.message );
        process.exit( 1 );
    } );
