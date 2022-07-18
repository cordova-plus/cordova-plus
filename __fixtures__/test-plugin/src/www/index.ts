import exec from "cordova/exec";

export const coolMethod = (arg0, success, error) => {
  exec(success, error, "Test", "coolMethod", [arg0]);
};
