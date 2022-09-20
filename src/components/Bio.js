import Typewriter from "typewriter-effect";

const Bio = () => {
    return (
        <div>
            <div className="text-white font-Roboto text-2xl font-bold
                            whitespace-pre-line">
                <Typewriter
                onInit={(typewriter)=> {
                typewriter
                .typeString("Patrick Deniso")
                .start();
                }}
                />
            </div>
            <div className="text-white font-Roboto text-2xl font-bold
                            whitespace-pre-line">
                <Typewriter
                onInit={(typewriter)=> {
                typewriter
                .pauseFor(2000)
                .typeString("Software Engineer")
                .start();
                }}
                />
            </div>
        </div>

    );
}

export default Bio;