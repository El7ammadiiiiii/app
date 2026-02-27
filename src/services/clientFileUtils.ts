/**
 * Client-side file utilities.
 *
 * IMPORTANT: This module is intended to be imported by client components only.
 * It must not include any server secrets.
 */

/** Convert a browser File to base64 (data payload only, without the data: URL prefix). */
export async function fileToBase64 ( file: File ): Promise<string>
{
    return new Promise( ( resolve, reject ) =>
    {
        const reader = new FileReader();
        reader.onload = () =>
        {
            const base64 = reader.result as string;
            const base64Data = base64.includes( ',' ) ? base64.split( ',' )[ 1 ] : base64;
            resolve( base64Data );
        };
        reader.onerror = reject;
        reader.readAsDataURL( file );
    } );
}

/** Download a data URL as a file (browser-only). */
export function downloadDataUrl ( dataUrl: string, filename: string )
{
    const link = document.createElement( 'a' );
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild( link );
    link.click();
    document.body.removeChild( link );
}
