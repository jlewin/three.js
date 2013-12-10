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
		string basePath = @"E:\src-ext\PrusaMendel\metric-prusa";
		string path = Path.Combine(basePath, Request["stlFile"]);

		if (File.Exists(path) && Path.GetExtension(path).ToLower() == ".stl")
		{
			Response.Write(File.ReadAllText(path));
		}
    }
}