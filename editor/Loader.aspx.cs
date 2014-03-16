using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class editor_Loader : System.Web.UI.Page
{
	protected void Page_Load(object sender, EventArgs e)
	{
		// Silly short term mechanism for repo selection
		var repos = new []{
		@"E:\src-ext\PrusaMendel\metric-prusa",
		@"E:\Redirected\Users\john\Downloads"};

		string path = Path.Combine(repos[1], Request["stlFile"]);

		Response.ContentType = "application/octet-stream";

		if (File.Exists(path) && Path.GetExtension(path).ToLower() == ".stl")
		{
			Response.WriteFile(path);
		}
	}
}